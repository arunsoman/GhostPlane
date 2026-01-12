package templates

import (
	"time"

	"github.com/arunsoman/GhostPlane/pkg/proxy"
)

// Template represents a production-ready configuration recipe.
type Template struct {
	Metadata      Metadata           `yaml:"metadata" json:"metadata"`
	Architecture  Architecture       `yaml:"architecture" json:"architecture"`
	Parameters    []Parameter        `yaml:"parameters" json:"parameters"`
	Configuration string             `yaml:"configuration" json:"configuration"`
	Verification  Verification       `yaml:"verification" json:"verification"`
	UseCases      []UseCase          `yaml:"use_cases,omitempty" json:"use_cases,omitempty"`
	Examples      []ParameterExample `yaml:"examples,omitempty" json:"examples,omitempty"`
}

// Metadata holds descriptive information about the template.
type Metadata struct {
	ID          string   `yaml:"id" json:"id"`
	Name        string   `yaml:"name" json:"name"`
	Category    string   `yaml:"category" json:"category"`
	Difficulty  string   `yaml:"difficulty" json:"difficulty"`
	Description string   `yaml:"description" json:"description"`
	Icon        string   `yaml:"icon" json:"icon"`
	Tags        []string `yaml:"tags" json:"tags"`
	Author      string   `yaml:"author" json:"author"`
	Version     string   `yaml:"version" json:"version"`
}

// Architecture describes the layers and components involved.
type Architecture struct {
	Layers     []string `yaml:"layers" json:"layers"`
	Components []string `yaml:"components" json:"components"`
	Diagram    string   `yaml:"diagram" json:"diagram"`
}

// Parameter defines a customizable input for the template.
type Parameter struct {
	Name        string      `yaml:"name" json:"name"`
	Type        string      `yaml:"type" json:"type"` // ip, ip_list, integer, string, boolean, enum
	Required    bool        `yaml:"required" json:"required"`
	Description string      `yaml:"description" json:"description"`
	Default     interface{} `yaml:"default,omitempty" json:"default,omitempty"`
	Secret      bool        `yaml:"secret,omitempty" json:"secret,omitempty"`
	Validation  string      `yaml:"validation,omitempty" json:"validation,omitempty"`
	Options     []string    `yaml:"options,omitempty" json:"options,omitempty"`
}

// RawConfiguration holds the unrendered configuration blocks.
type RawConfiguration map[string]interface{}

// Verification defines test requests and metrics to check after deployment.
type Verification struct {
	TestRequests   []TestRequest `yaml:"test_requests" json:"test_requests"`
	MetricsToCheck []string      `yaml:"metrics_to_check" json:"metrics_to_check"`
}

// TestRequest represents a single verification probe.
type TestRequest struct {
	Method         string            `yaml:"method" json:"method"`
	Path           string            `yaml:"path" json:"path"`
	Headers        map[string]string `yaml:"headers,omitempty" json:"headers,omitempty"`
	Body           string            `yaml:"body,omitempty" json:"body,omitempty"`
	ExpectedStatus int               `yaml:"expected_status" json:"expected_status"`
}

// UseCase provides a high-level description of when to use this template.
type UseCase struct {
	Title       string `yaml:"title" json:"title"`
	Description string `yaml:"description" json:"description"`
}

// ParameterExample provides helpful preset values for the UI.
type ParameterExample struct {
	Title      string                 `yaml:"title" json:"title"`
	Scenario   string                 `yaml:"scenario" json:"scenario"`
	Parameters map[string]interface{} `yaml:"parameters" json:"parameters"`
}

// RenderedConfig represents the final, system-compatible output of a template.
type RenderedConfig struct {
	L7Routes []proxy.ConfigRoute    `yaml:"l7_routes,omitempty" json:"l7_routes,omitempty"`
	L4Config map[string]interface{} `yaml:"l4_config,omitempty" json:"l4_config,omitempty"`
}

// Deployment represents an active deployment of a template.
type Deployment struct {
	ID         string                 `json:"id"`
	TemplateID string                 `json:"template_id"`
	Status     string                 `json:"status"` // pending, deploying, active, failed, dry-run
	Progress   int                    `json:"progress"`
	Config     *RenderedConfig        `json:"config"`
	Parameters map[string]interface{} `json:"parameters"`
	CreatedAt  time.Time              `json:"created_at"`
	Errors     []string               `json:"errors,omitempty"`
}
