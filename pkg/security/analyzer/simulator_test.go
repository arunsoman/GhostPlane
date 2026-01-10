package analyzer

import (
	"testing"
	"time"
)

func TestDetector_HighRPS(t *testing.T) {
	window := 1 * time.Second
	threshold := 5
	detector := NewDetector(window, threshold)

	ip := "192.168.1.1"

	// Record requests below threshold
	for i := 0; i < threshold; i++ {
		anomaly := detector.RecordRequest(ip)
		if anomaly != nil {
			t.Errorf("Unexpected anomaly at iteration %d", i)
		}
	}

	// Next request should trigger anomaly
	anomaly := detector.RecordRequest(ip)
	if anomaly == nil {
		t.Fatal("Expected anomaly, got nil")
	}

	if anomaly.SourceIP != ip {
		t.Errorf("Expected IP %s, got %s", ip, anomaly.SourceIP)
	}

	if anomaly.Type != AnomalyHighRPS {
		t.Errorf("Expected type %s, got %s", AnomalyHighRPS, anomaly.Type)
	}
}

func TestDetector_WindowRotation(t *testing.T) {
	window := 100 * time.Millisecond
	threshold := 2
	detector := NewDetector(window, threshold)

	ip := "1.2.3.4"

	detector.RecordRequest(ip)
	detector.RecordRequest(ip)

	// Wait for rotation
	time.Sleep(150 * time.Millisecond)

	count := detector.GetCount(ip)
	if count != 0 {
		// Even if not rotated yet by the next call, the record request should do it
		anomaly := detector.RecordRequest(ip)
		if anomaly != nil {
			t.Error("Should not have anomaly after window rotation")
		}
	}
}

func TestDetector_Simulator(t *testing.T) {
	// Automated DDoS simulation as requested in the implementation plan
	window := 1 * time.Second
	threshold := 10
	detector := NewDetector(window, threshold)

	targetIP := "10.0.0.5"

	// Simulate slow-drip attack
	// 5 requests per second (below threshold)
	for i := 0; i < 5; i++ {
		detector.RecordRequest(targetIP)
	}
	
	if detector.GetCount(targetIP) > threshold {
		t.Fatal("Should not be throttled yet")
	}

	// Ramp up to aggressive
	for i := 0; i < 10; i++ {
		anomaly := detector.RecordRequest(targetIP)
		if i >= 5 && anomaly == nil {
			t.Errorf("Expected anomaly at iteration %d", i)
		}
	}
}

func TestDetector_HighBurst(t *testing.T) {
	detector := NewDetector(1*time.Second, 1)
	ip := "1.1.1.1"
	// Request 1: count=1 (no anomaly)
	detector.RecordRequest(ip)
	// Request 2: count=2 (anomaly)
	detector.RecordRequest(ip)
	// Many requests: confidence should cap at 0.99
	var lastAnomaly *Anomaly
	for i := 0; i < 50; i++ {
		lastAnomaly = detector.RecordRequest(ip)
	}
	if lastAnomaly == nil {
		t.Fatal("Expected anomaly, got nil")
	}
	if lastAnomaly.Confidence != 0.99 {
		t.Errorf("Expected capped confidence 0.99, got %f", lastAnomaly.Confidence)
	}
}
