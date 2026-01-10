package audit

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

// Event represents an immutable audit log event
type Event struct {
	Timestamp     time.Time              `json:"timestamp"`
	CorrelationID string                 `json:"correlation_id"`
	EventType     string                 `json:"event_type"`
	Actor         string                 `json:"actor"`
	Action        string                 `json:"action"`
	Resource      string                 `json:"resource"`
	Details       map[string]interface{} `json:"details"`
}

// Logger is an append-only audit log
type Logger struct {
	mu     sync.Mutex
	events []Event
	// TODO: Add persistent storage (e.g., write to file or database)
}

// New creates a new audit logger
func New() *Logger {
	return &Logger{
		events: make([]Event, 0),
	}
}

// Log records an audit event
func (l *Logger) Log(e Event) {
	e.Timestamp = time.Now()
	
	l.mu.Lock()
	defer l.mu.Unlock()
	
	l.events = append(l.events, e)
	
	// TODO: Write to persistent storage
	data, _ := json.Marshal(e)
	log.Printf("[AUDIT] %s", string(data))
}

// Query returns all events (for debugging)
// TODO: Implement filtering by time, actor, event type, etc.
func (l *Logger) Query() []Event {
	l.mu.Lock()
	defer l.mu.Unlock()
	
	result := make([]Event, len(l.events))
	copy(result, l.events)
	return result
}
