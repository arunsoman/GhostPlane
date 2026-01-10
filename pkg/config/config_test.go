package config

import (
	"os"
	"testing"
)

func TestLoad(t *testing.T) {
	content := `
proxy_addr: ":8080"
admin_addr: ":9090"
backends:
  - "http://localhost:8081"
  - "http://localhost:8082"
`
	tmpfile, err := os.CreateTemp("", "config.yaml")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(tmpfile.Name())

	if _, err := tmpfile.Write([]byte(content)); err != nil {
		t.Fatal(err)
	}
	if err := tmpfile.Close(); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load(tmpfile.Name())
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.ProxyAddr != ":8080" {
		t.Errorf("Expected ProxyAddr :8080, got %s", cfg.ProxyAddr)
	}
	if len(cfg.Backends) != 2 {
		t.Errorf("Expected 2 backends, got %d", len(cfg.Backends))
	}
}

func TestLoad_NotFound(t *testing.T) {
	_, err := Load("non-existent.yaml")
	if err == nil {
		t.Error("Expected error for non-existent file, got nil")
	}
}

func TestLoad_InvalidYAML(t *testing.T) {
	tmpfile, _ := os.CreateTemp("", "invalid.yaml")
	defer os.Remove(tmpfile.Name())
	tmpfile.Write([]byte("invalid: yaml: :"))
	tmpfile.Close()

	_, err := Load(tmpfile.Name())
	if err == nil {
		t.Error("Expected error for invalid YAML, got nil")
	}
}
