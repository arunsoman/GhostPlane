package analyzer

import (
	"sync"
	"time"
)

// AnomalyType represents the type of detected anomaly
type AnomalyType string

const (
	AnomalyHighRPS AnomalyType = "HIGH_RPS"
	AnomalyDDoS    AnomalyType = "DDOS_ATTACK"
)

// Anomaly represents a detected suspicious traffic pattern
type Anomaly struct {
	SourceIP   string
	Type       AnomalyType
	Confidence float64
	Timestamp  time.Time
}

// Detector analyzes traffic patterns to detect anomalies
type Detector struct {
	mu           sync.Mutex
	windowSize   time.Duration
	threshold    int
	counters     map[string]int
	lastRotation time.Time
}

// NewDetector creates a new traffic anomaly detector
func NewDetector(windowSize time.Duration, threshold int) *Detector {
	return &Detector{
		windowSize:   windowSize,
		threshold:    threshold,
		counters:     make(map[string]int),
		lastRotation: time.Now(),
	}
}

// RecordRequest registers an incoming request from a source IP
func (d *Detector) RecordRequest(ip string) *Anomaly {
	d.mu.Lock()
	defer d.mu.Unlock()

	// Rotate window if needed
	if time.Since(d.lastRotation) > d.windowSize {
		d.counters = make(map[string]int)
		d.lastRotation = time.Now()
	}

	d.counters[ip]++

	if d.counters[ip] > d.threshold {
		// Calculate confidence based on burst magnitude
		confidence := 0.85 + (0.15 * float64(d.counters[ip]-d.threshold) / float64(d.threshold))
		if confidence > 0.99 {
			confidence = 0.99
		}

		return &Anomaly{
			SourceIP:   ip,
			Type:       AnomalyHighRPS,
			Confidence: confidence,
			Timestamp:  time.Now(),
		}
	}

	return nil
}

// GetCount returns the current request count for an IP in the current window
func (d *Detector) GetCount(ip string) int {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.counters[ip]
}
