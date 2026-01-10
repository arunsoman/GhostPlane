package db

import (
	"os"
	"testing"
)

func TestStore(t *testing.T) {
	dbPath := "./test_nlb.db"
	defer os.Remove(dbPath)

	store, err := NewStore(dbPath)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()

	// Check default
	complete, err := store.IsSetupComplete()
	if err != nil {
		t.Errorf("IsSetupComplete failed: %v", err)
	}
	if complete {
		t.Error("Expected setup_complete to be false initially")
	}

	// Set and get
	err = store.SetSetting("cluster_name", "test-cluster")
	if err != nil {
		t.Errorf("SetSetting failed: %v", err)
	}

	val, err := store.GetSetting("cluster_name")
	if err != nil {
		t.Errorf("GetSetting failed: %v", err)
	}
	if val != "test-cluster" {
		t.Errorf("Expected test-cluster, got %s", val)
	}

	// Complete setup
	err = store.SetSetting("setup_complete", "true")
	if err != nil {
		t.Errorf("SetSetting failed: %v", err)
	}

	complete, err = store.IsSetupComplete()
	if err != nil {
		t.Errorf("IsSetupComplete failed: %v", err)
	}
	if !complete {
		t.Error("Expected setup_complete to be true")
	}
}
