package templates

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/arunsoman/GhostPlane/pkg/db"
	"github.com/arunsoman/GhostPlane/pkg/ebpf"
	"github.com/arunsoman/GhostPlane/pkg/proxy"
)

type ErrorResponse struct {
	Error string `json:"error"`
}

func sendJSONError(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}

// Handler handles template-related HTTP requests.
type Handler struct {
	repo           *Repository
	renderer       *Renderer
	simulator      *Simulator
	proxy          *proxy.Proxy
	ebpfLoader     *ebpf.Loader
	store          *db.Store
	deploymentChan chan<- Deployment
}

// NewHandler creates a new template handler.
func NewHandler(repo *Repository, renderer *Renderer, simulator *Simulator, p *proxy.Proxy, el *ebpf.Loader, s *db.Store, dChan chan<- Deployment) *Handler {
	return &Handler{
		repo:           repo,
		renderer:       renderer,
		simulator:      simulator,
		proxy:          p,
		ebpfLoader:     el,
		store:          s,
		deploymentChan: dChan,
	}
}

// ListTemplates returns a list of all available templates.
func (h *Handler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"templates": h.repo.List(),
	})
}

// GetTemplate returns the details of a specific template.
func (h *Handler) GetTemplate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract ID from path: /api/v1/templates/{id}
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 {
		sendJSONError(w, "Invalid template ID", http.StatusBadRequest)
		return
	}
	id := parts[4]

	tmpl, err := h.repo.Get(id)
	if err != nil {
		sendJSONError(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tmpl)
}

// DeployTemplate replaces parameters and applies the configuration.
func (h *Handler) DeployTemplate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// For /api/v1/templates/{id}/deploy, the ID is the 5th segment
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 6 {
		sendJSONError(w, "Invalid deployment path", http.StatusBadRequest)
		return
	}
	id := parts[4]

	var req struct {
		Parameters map[string]interface{} `json:"parameters"`
		DryRun     bool                   `json:"dry_run"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	tmpl, err := h.repo.Get(id)
	if err != nil {
		sendJSONError(w, err.Error(), http.StatusNotFound)
		return
	}

	// Render the configuration
	finalConfig, err := h.renderer.Render(tmpl, req.Parameters)
	if err != nil {
		sendJSONError(w, fmt.Sprintf("failed to render template: %v", err), http.StatusBadRequest)
		return
	}

	// Generate ID for the deployment
	deploymentID := "deploy-" + fmt.Sprintf("%d", time.Now().Unix())

	deployment := Deployment{
		ID:         deploymentID,
		TemplateID: id,
		Status:     "dry-run",
		Config:     finalConfig,
		Parameters: req.Parameters,
		CreatedAt:  time.Now(),
	}

	status := "dry-run"
	if !req.DryRun {
		status = "active"
		deployment.Status = status

		// 1. Apply L7 Routes
		if len(finalConfig.L7Routes) > 0 {
			// Attach Source Metadata
			for i := range finalConfig.L7Routes {
				finalConfig.L7Routes[i].Source = &proxy.RouteSource{
					Type:         "template",
					TemplateID:   id,
					DeploymentID: deployment.ID,
				}
			}

			if err := h.proxy.UpdateRoutes(finalConfig.L7Routes); err != nil {
				sendJSONError(w, fmt.Sprintf("failed to update L7 routes: %v", err), http.StatusInternalServerError)
				return
			}
		}

		// 2. Apply L4 Config (if any)
		if listenerPort, ok := finalConfig.L4Config["listener_port"].(float64); ok && h.ebpfLoader != nil {
			if err := h.ebpfLoader.AddListener(uint16(listenerPort)); err != nil {
				// Log but don't fail, as it might already exist
				fmt.Printf("⚠️ Failed to add listener %d: %v\n", int(listenerPort), err)
			}
		}

		// 3. Persist to DB
		if err := h.store.SaveRoutes(finalConfig.L7Routes); err != nil {
			fmt.Printf("⚠️ Failed to persist routes: %v\n", err)
		}
	}

	// 4. Save Deployment to DB
	if !req.DryRun {
		err := h.store.SaveDeployment(deployment.ID, deployment.TemplateID, deployment.Parameters, deployment.Config, deployment.Status)
		if err != nil {
			fmt.Printf("⚠️ Failed to persist deployment: %v\n", err)
		}
	}

	// 5. Broadcast Event
	if !req.DryRun && h.deploymentChan != nil {
		select {
		case h.deploymentChan <- deployment:
		default:
			// Channel full, drop event
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(deployment)
}

// GetActiveDeployment retrieves the latest active deployment
func (h *Handler) GetActiveDeployment(w http.ResponseWriter, r *http.Request) {
	// We primarily use deployment_id query param

	// This assumes the deployment ID is passed, OR we fetch the latest.
	// For "Edit" in UI, we will pass the deployment ID directly usually.
	// But the user plan said "active deployment for template".
	// To support the specific "Edit" button from RouteTable which has deployment_id,
	// let's actually support fetching by Deployment ID as well or just stick to the plan.
	// Plan: GetLatestDeployment(templateID).
	// Wait, the Store update added GetDeployment(id).
	// Let's implement getting a generic deployment by ID first as that is more useful for "Edit".

	deploymentID := r.URL.Query().Get("deployment_id")
	if deploymentID != "" {
		d, err := h.store.GetDeployment(deploymentID)
		if err != nil {
			sendJSONError(w, "deployment not found", http.StatusNotFound)
			return
		}

		// Parse JSON strings back to objects
		var params map[string]interface{}
		json.Unmarshal([]byte(d.Parameters), &params)

		resp := Deployment{
			ID:         d.ID,
			TemplateID: d.TemplateID,
			Status:     d.Status,
			Parameters: params,
			CreatedAt:  time.Now(), // DB has string, keeping it simple for now
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}

	sendJSONError(w, "deployment_id required", http.StatusBadRequest)
}

func (h *Handler) VerifyTemplate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 {
		sendJSONError(w, "Invalid template ID", http.StatusBadRequest)
		return
	}
	id := parts[4]

	tmpl, err := h.repo.Get(id)
	if err != nil {
		sendJSONError(w, err.Error(), http.StatusNotFound)
		return
	}

	// For local dev, we default to localhost:8080 (standard proxy port)
	proxyURL := "http://localhost:8080"
	results, err := h.simulator.VerifyTemplate(r.Context(), tmpl, proxyURL)
	if err != nil {
		sendJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"template_id": id,
		"results":     results,
	})
}
