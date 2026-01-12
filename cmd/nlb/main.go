package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/arunsoman/GhostPlane/pkg/api"
	"github.com/arunsoman/GhostPlane/pkg/auth"
	"github.com/arunsoman/GhostPlane/pkg/config"
	"github.com/arunsoman/GhostPlane/pkg/db"
	"github.com/arunsoman/GhostPlane/pkg/ebpf"
	"github.com/arunsoman/GhostPlane/pkg/proxy"
	"github.com/arunsoman/GhostPlane/pkg/telemetry"
)

var (
	telemetryInit = telemetry.Init
)

func main() {
	if err := run(os.Args, os.LookupEnv, context.Background()); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run(args []string, lookupEnv func(string) (string, bool), baseCtx context.Context) error {
	flags := flag.NewFlagSet(args[0], flag.ContinueOnError)
	configPath := flags.String("config", "config.yaml", "Path to config file")
	if err := flags.Parse(args[1:]); err != nil {
		return err
	}

	// Load config
	cfg, err := config.Load(*configPath)
	if err != nil {
		return fmt.Errorf("failed to load config: %v", err)
	}

	// Initialize telemetry (OpenTelemetry)
	ctx, stop := signal.NotifyContext(baseCtx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	shutdown, err := telemetryInit(ctx, "nlb")
	if err != nil {
		return fmt.Errorf("failed to initialize telemetry: %v", err)
	}
	defer func() {
		if err := shutdown(ctx); err != nil {
			log.Printf("failed to shutdown telemetry: %v", err)
		}
	}()

	// Get auth credentials from environment or use defaults
	jwtSecret := getEnvOrDefault(lookupEnv, "NLB_JWT_SECRET", "change-this-in-production-please")
	adminUsername := getEnvOrDefault(lookupEnv, "NLB_ADMIN_USERNAME", "admin")
	adminPassword := getEnvOrDefault(lookupEnv, "NLB_ADMIN_PASSWORD", "admin123")

	// Initialize auth service
	authService, err := auth.NewAuthService(jwtSecret, adminUsername, adminPassword)
	if err != nil {
		return fmt.Errorf("failed to initialize auth service: %v", err)
	}

	log.Printf("✅ Default admin user created: %s", adminUsername)
	log.Printf("⚠️  Please change the default password in production!")

	log.Printf("Starting NLB+ with config: %s", *configPath)

	// Initialize Persistent Storage
	store, err := db.NewStore("data/nlb.db")
	if err != nil {
		log.Fatalf("failed to initialize database: %v", err)
	}
	defer store.Close()

	// Initialize proxy
	backends := []string{"http://localhost:8081", "http://localhost:8082"}
	p, err := proxy.New(backends)
	if err != nil {
		return fmt.Errorf("failed to create proxy: %v", err)
	}

	// Initialize eBPF Loader (if running as root/with required caps)
	var loader *ebpf.Loader
	if os.Geteuid() == 0 {
		log.Println("⚡ Initializing eBPF/XDP data plane on eth0")
		loader = ebpf.NewLoader("eth0", []string{"10.0.1.10", "10.0.1.11"}, []uint16{80, 443})
		if err := loader.Load(); err != nil {
			log.Printf("⚠️  Failed to load eBPF (continuing without XDP): %v", err)
			loader = nil // Fallback
		} else {
			defer loader.Close()
		}
	} else {
		log.Println("ℹ️  Not running as root, skipping eBPF initialization")
	}

	// Initialize Management API
	apiServer, err := api.NewServer(cfg, authService, p, loader, store, "templates")
	if err != nil {
		log.Fatalf("failed to initialize API server: %v", err)
	}

	// Restore persisted routes
	if err := apiServer.InitializeRoutes(); err != nil {
		log.Printf("⚠️  Failed to restore routes: %v", err)
	}

	errCh := make(chan error, 2)

	// Start proxy in background
	go func() {
		log.Printf("🚀 Starting L7 Proxy on %s", cfg.ProxyAddr)
		if err := p.Start(cfg.ProxyAddr); err != nil && err != http.ErrServerClosed {
			errCh <- fmt.Errorf("proxy failed: %v", err)
		}
	}()

	// Initialize and start Management API with auth
	go func() {
		log.Printf("🌐 Starting Management API on %s", cfg.AdminAddr)
		if err := apiServer.Start(cfg.AdminAddr); err != nil && err != http.ErrServerClosed {
			errCh <- fmt.Errorf("API server failed: %v", err)
		}
	}()

	// Wait for shutdown signal or error
	select {
	case <-ctx.Done():
		log.Println("🛑 Shutting down gracefully...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := p.Shutdown(shutdownCtx); err != nil {
			log.Printf("proxy shutdown error: %v", err)
		}
		if err := apiServer.Shutdown(shutdownCtx); err != nil {
			log.Printf("API server shutdown error: %v", err)
		}
		return nil
	case err := <-errCh:
		return err
	}
}

func getEnvOrDefault(lookupEnv func(string) (string, bool), key, defaultValue string) string {
	if value, exists := lookupEnv(key); exists {
		return value
	}
	return defaultValue
}
