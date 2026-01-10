package telemetry

import (
	"context"
	"testing"
)

func TestInit(t *testing.T) {
	ctx := context.Background()
	serviceName := "test-service"

	shutdown, err := Init(ctx, serviceName)
	if err != nil {
		t.Fatalf("Init failed: %v", err)
	}

	if shutdown == nil {
		t.Fatal("Shutdown function is nil")
	}

	// Test shutdown
	if err := shutdown(ctx); err != nil {
		t.Errorf("Shutdown failed: %v", err)
	}
}
