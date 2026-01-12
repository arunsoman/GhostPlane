package templates

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"time"
)

// Simulator handles synthetic traffic generation for verification.
type Simulator struct {
	client *http.Client
}

// NewSimulator creates a new traffic simulator.
func NewSimulator() *Simulator {
	return &Simulator{
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// VerificationResult holds the outcome of a single probe.
type VerificationResult struct {
	Step           string `json:"step"`
	Success        bool   `json:"success"`
	Message        string `json:"message"`
	ResponseTimeMs int64  `json:"response_time_ms"`
}

// VerifyTemplate performs all verification checks defined in a template.
func (s *Simulator) VerifyTemplate(ctx context.Context, tmpl *Template, baseURL string) ([]VerificationResult, error) {
	results := []VerificationResult{}

	for _, req := range tmpl.Verification.TestRequests {
		start := time.Now()

		// Build the URL (assuming baseURL is the proxy address)
		url := fmt.Sprintf("%s%s", baseURL, req.Path)

		httpReq, err := http.NewRequestWithContext(ctx, req.Method, url, bytes.NewBufferString(req.Body))
		if err != nil {
			results = append(results, VerificationResult{
				Step:    fmt.Sprintf("%s %s", req.Method, req.Path),
				Success: false,
				Message: fmt.Sprintf("Failed to create request: %v", err),
			})
			continue
		}

		// Add headers
		for k, v := range req.Headers {
			httpReq.Header.Set(k, v)
		}

		resp, err := s.client.Do(httpReq)
		duration := time.Since(start).Milliseconds()

		if err != nil {
			results = append(results, VerificationResult{
				Step:           fmt.Sprintf("%s %s", req.Method, req.Path),
				Success:        false,
				Message:        fmt.Sprintf("Request failed: %v", err),
				ResponseTimeMs: duration,
			})
			continue
		}
		resp.Body.Close()

		success := resp.StatusCode == req.ExpectedStatus
		msg := fmt.Sprintf("Expected %d, got %d", req.ExpectedStatus, resp.StatusCode)
		if success {
			msg = "Verification successful"
		}

		results = append(results, VerificationResult{
			Step:           fmt.Sprintf("%s %s", req.Method, req.Path),
			Success:        success,
			Message:        msg,
			ResponseTimeMs: duration,
		})
	}

	return results, nil
}
