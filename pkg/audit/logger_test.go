package audit

import (
	"testing"
)

func TestLogger_Log(t *testing.T) {
	l := New()
	event := Event{
		CorrelationID: "test-id",
		EventType:     "config_change",
		Actor:         "admin",
		Action:        "update",
		Resource:      "proxy_config",
		Details:       map[string]interface{}{"key": "value"},
	}

	l.Log(event)

	events := l.Query()
	if len(events) != 1 {
		t.Fatalf("Expected 1 event, got %d", len(events))
	}

	if events[0].CorrelationID != "test-id" {
		t.Errorf("Expected correlation_id 'test-id', got '%s'", events[0].CorrelationID)
	}

	if events[0].Timestamp.IsZero() {
		t.Error("Timestamp should not be zero")
	}
}

func TestLogger_QueryImmunity(t *testing.T) {
	l := New()
	l.Log(Event{CorrelationID: "id1"})

	events := l.Query()
	events[0].CorrelationID = "modified"

	// Verify original event is not modified
	original := l.Query()
	if original[0].CorrelationID != "id1" {
		t.Errorf("Audit log should be immutable, got '%s'", original[0].CorrelationID)
	}
}
