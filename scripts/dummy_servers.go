package main

import (
	"fmt"
	"net/http"
	"sync"
)

func startServer(port string, name string) {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Printf("[%s] Received request: %s %s\n", name, r.Method, r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"server": "%s", "port": "%s", "status": "online"}`, name, port)
	})

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	fmt.Printf("🚀 %s starting on :%s\n", name, port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		fmt.Printf("❌ %s failed: %v\n", name, err)
	}
}

func main() {
	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		startServer("9090", "Backend-Blue (9090)")
	}()

	go func() {
		defer wg.Done()
		startServer("9091", "Backend-Green (9091)")
	}()

	wg.Wait()
}
