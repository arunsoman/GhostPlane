package main

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"
)

func TestRun_InvalidArgs(t *testing.T) {
	err := run([]string{"cmd", "-invalid"}, func(string) (string, bool) { return "", false }, context.Background())
	if err == nil {
		t.Error("Expected error for invalid flags")
	}
}

func TestRun_ConfigNotFound(t *testing.T) {
	err := run([]string{"cmd", "-config", "nonexistent.yaml"}, func(string) (string, bool) { return "", false }, context.Background())
	if err == nil {
		t.Error("Expected error for missing config")
	}
}

func TestRun_InvalidConfig(t *testing.T) {
	tmpfile, _ := os.CreateTemp("", "invalid.yaml")
	defer os.Remove(tmpfile.Name())
	tmpfile.Write([]byte("invalid: yaml: :"))
	tmpfile.Close()

	err := run([]string{"cmd", "-config", tmpfile.Name()}, func(string) (string, bool) { return "", false }, context.Background())
	if err == nil {
		t.Error("Expected error for invalid config content")
	}
}

func TestRun_TelemetryError(t *testing.T) {
	tmpfile, _ := os.CreateTemp("", "config.yaml")
	defer os.Remove(tmpfile.Name())
	tmpfile.Write([]byte("proxy_addr: :0\nadmin_addr: :0\nbackends: []"))
	tmpfile.Close()

	oldInit := telemetryInit
	defer func() { telemetryInit = oldInit }()
	telemetryInit = func(ctx context.Context, serviceName string) (func(context.Context) error, error) {
		return nil, fmt.Errorf("telemetry failed")
	}

	err := run([]string{"cmd", "-config", tmpfile.Name()}, func(string) (string, bool) { return "", false }, context.Background())
	if err == nil || err.Error() != "failed to initialize telemetry: telemetry failed" {
		t.Errorf("Expected telemetry error, got %v", err)
	}
}

func TestRun_ProxyError(t *testing.T) {
	content := `
backends:
  - " ://broken"
`
	tmpfile, _ := os.CreateTemp("", "broken_config.yaml")
	defer os.Remove(tmpfile.Name())
	tmpfile.Write([]byte(content))
	tmpfile.Close()

	err := run([]string{"cmd", "-config", tmpfile.Name()}, func(string) (string, bool) { return "", false }, context.Background())
	if err == nil {
		t.Error("Expected error for invalid backend URL")
	}
}

func TestRun_Success(t *testing.T) {
	content := `
proxy_addr: ":0"
admin_addr: ":0"
backends:
  - "http://localhost:8081"
`
	tmpfile, _ := os.CreateTemp("", "config.yaml")
	defer os.Remove(tmpfile.Name())
	tmpfile.Write([]byte(content))
	tmpfile.Close()

	oldInit := telemetryInit
	defer func() { telemetryInit = oldInit }()
	telemetryInit = func(ctx context.Context, serviceName string) (func(context.Context) error, error) {
		return func(context.Context) error { return nil }, nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	
	errCh := make(chan error, 1)
	go func() {
		errCh <- run([]string{"cmd", "-config", tmpfile.Name()}, func(string) (string, bool) { return "", false }, ctx)
	}()

	// Wait for servers to start
	time.Sleep(200 * time.Millisecond)
	cancel() // Trigger shutdown

	select {
	case err := <-errCh:
		if err != nil {
			t.Errorf("run failed: %v", err)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("run didn't exit in time after cancellation")
	}
}

func TestRun_ServerError(t *testing.T) {
	// Trigger a server error (e.g., port already in use)
	// We can use a trick: start a listener on a port, and then try to start NLB on that port
	// But let's just use the errCh logic.
	
	content := `
proxy_addr: "invalid_addr" # This will cause an error on Start
admin_addr: ":0"
backends: []
`
	tmpfile, _ := os.CreateTemp("", "config.yaml")
	defer os.Remove(tmpfile.Name())
	tmpfile.Write([]byte(content))
	tmpfile.Close()

	oldInit := telemetryInit
	defer func() { telemetryInit = oldInit }()
	telemetryInit = func(ctx context.Context, serviceName string) (func(context.Context) error, error) {
		return func(context.Context) error { return nil }, nil
	}

	err := run([]string{"cmd", "-config", tmpfile.Name()}, func(string) (string, bool) { return "", false }, context.Background())
	if err == nil {
		t.Error("Expected error for invalid address")
	}
}
