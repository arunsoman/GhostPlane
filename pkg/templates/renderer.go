package templates

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"text/template"

	"gopkg.in/yaml.v3"
)

// Renderer handles parameter substitution in templates.
type Renderer struct {
	funcMap template.FuncMap
}

// NewRenderer creates a new renderer with essential helper functions.
func NewRenderer() *Renderer {
	return &Renderer{
		funcMap: template.FuncMap{
			"default": func(def interface{}, val interface{}) interface{} {
				if val == nil || val == "" {
					return def
				}
				return val
			},
			"split": func(sep, s string) []string {
				if s == "" {
					return []string{}
				}
				parts := strings.Split(s, sep)
				for i := range parts {
					parts[i] = strings.TrimSpace(parts[i])
				}
				return parts
			},
			"json": func(v interface{}) (string, error) {
				b, err := json.Marshal(v)
				return string(b), err
			},
		},
	}
}

// Render processes a template with the provided parameters and returns a system-compatible configuration.
func (r *Renderer) Render(tmpl *Template, params map[string]interface{}) (*RenderedConfig, error) {
	// 1. Normalize and Validate parameters
	normalizedParams := make(map[string]interface{})
	for k, v := range params {
		normalizedParams[k] = v
	}

	for _, p := range tmpl.Parameters {
		val, ok := normalizedParams[p.Name]
		if p.Required && !ok {
			return nil, fmt.Errorf("missing required parameter: %s", p.Name)
		}

		// Normalize list types if they come in as comma-separated strings
		if ok && p.Type == "ip_list" {
			if s, isStr := val.(string); isStr {
				parts := strings.Split(s, ",")
				for i := range parts {
					parts[i] = strings.TrimSpace(parts[i])
				}
				normalizedParams[p.Name] = parts
			}
		}
	}

	// 2. Render using text/template
	t, err := template.New(tmpl.Metadata.ID).Funcs(r.funcMap).Parse(tmpl.Configuration)
	if err != nil {
		return nil, fmt.Errorf("failed to parse template string: %w", err)
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, normalizedParams); err != nil {
		return nil, fmt.Errorf("failed to execute template: %w", err)
	}

	// 3. Convert to final RenderedConfig object
	var finalConfig RenderedConfig
	if err := yaml.Unmarshal(buf.Bytes(), &finalConfig); err != nil {
		return nil, fmt.Errorf("failed to unmarshal into RenderedConfig: %w. Buf: %s", err, buf.String())
	}

	return &finalConfig, nil
}
