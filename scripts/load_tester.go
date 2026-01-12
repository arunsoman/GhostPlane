package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

var (
	targetURL   = flag.String("url", "http://localhost:8080/api/v1/test", "Proxy URL to test")
	metricsURL  = flag.String("metrics", "http://localhost:8081/api/v1/metrics", "Metrics API URL")
	duration    = flag.Duration("duration", 6*time.Minute, "Duration of the test")
	concurrency = flag.Int("c", 10, "Number of concurrent workers")
	adminToken  = flag.String("token", "", "Bearer token for metrics API")
)

func main() {
	flag.Parse()

	if *adminToken == "" {
		fmt.Println("⚠️  Warning: No admin token provided. Metrics query might fail if auth is enabled.")
	}

	fmt.Printf("🚀 Starting Load Test\n")
	fmt.Printf("Target: %s\n", *targetURL)
	fmt.Printf("Duration: %v\n", *duration)
	fmt.Printf("Concurrency: %d\n", *concurrency)

	var successCount uint64
	var failCount uint64
	stopChan := make(chan struct{})

	// Start workers
	var wg sync.WaitGroup
	for i := 0; i < *concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			client := &http.Client{Timeout: 2 * time.Second}
			for {
				select {
				case <-stopChan:
					return
				default:
					resp, err := client.Get(*targetURL)
					if err == nil {
						if resp.StatusCode < 500 {
							atomic.AddUint64(&successCount, 1)
						} else {
							atomic.AddUint64(&failCount, 1)
						}
						io.Copy(io.Discard, resp.Body)
						resp.Body.Close()
					} else {
						atomic.AddUint64(&failCount, 1)
					}
					// Small sleep to prevent overwhelming local networking
					time.Sleep(10 * time.Millisecond)
				}
			}
		}()
	}

	// Metrics Poller
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		start := time.Now()

		for {
			select {
			case <-stopChan:
				return
			case <-ticker.C:
				elapsed := time.Since(start)
				fmt.Printf("\n--- Status at %s ---\n", elapsed.Round(time.Second))
				fmt.Printf("Requests Sent: %d (Success: %d, Failed: %d)\n",
					atomic.LoadUint64(&successCount)+atomic.LoadUint64(&failCount),
					atomic.LoadUint64(&successCount),
					atomic.LoadUint64(&failCount))

				// Fetch System Metrics
				fetchMetrics(*metricsURL, *adminToken)
			}
		}
	}()

	// Wait for duration
	time.Sleep(*duration)
	close(stopChan)
	wg.Wait()

	fmt.Printf("\n🏁 Load Test Complete!\n")
	fmt.Printf("Total Requests: %d\n", atomic.LoadUint64(&successCount)+atomic.LoadUint64(&failCount))
}

func fetchMetrics(url, token string) {
	req, _ := http.NewRequest("GET", url, nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Printf("Metrics Error: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		fmt.Printf("Metrics API returned %s\n", resp.Status)
		// Try to read body for error
		body, _ := io.ReadAll(resp.Body)
		if len(body) > 0 {
			fmt.Printf("Body: %s\n", string(body))
		}
		return
	}

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		fmt.Printf("Metrics JSON Error: %v\n", err)
		return
	}

	fmt.Printf("System Metrics: Active Conns: %v, Total Reqs: %v\n", data["active_connections"], data["total_requests"])
}
