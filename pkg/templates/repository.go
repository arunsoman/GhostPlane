package templates

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"gopkg.in/yaml.v3"
)

// Repository manages the loading and retrieval of templates.
type Repository struct {
	basePath  string
	templates map[string]*Template
	mu        sync.RWMutex
}

// NewRepository creates a new repository at the specified path.
func NewRepository(basePath string) (*Repository, error) {
	repo := &Repository{
		basePath:  basePath,
		templates: make(map[string]*Template),
	}

	if err := repo.Reload(); err != nil {
		return nil, err
	}

	return repo, nil
}

// Reload scans the base path for YAML template files and loads them.
func (r *Repository) Reload() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	newTemplates := make(map[string]*Template)
	err := filepath.Walk(r.basePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && (filepath.Ext(path) == ".yaml" || filepath.Ext(path) == ".yml") {
			// Skip files in the _library directory as they are usually fragments
			if filepath.Base(filepath.Dir(path)) == "_library" {
				return nil
			}

			data, err := os.ReadFile(path)
			if err != nil {
				return fmt.Errorf("failed to read template %s: %w", path, err)
			}

			var tmpl Template
			if err := yaml.Unmarshal(data, &tmpl); err != nil {
				return fmt.Errorf("failed to parse template %s: %w", path, err)
			}

			if tmpl.Metadata.ID == "" {
				return fmt.Errorf("template %s is missing an ID", path)
			}

			newTemplates[tmpl.Metadata.ID] = &tmpl
		}
		return nil
	})

	if err != nil {
		return err
	}

	r.templates = newTemplates
	fmt.Printf("📂 Template Repository: Loaded %d templates from %s\n", len(r.templates), r.basePath)
	return nil
}

// List returns a summary of all available templates.
func (r *Repository) List() []Template {
	r.mu.RLock()
	defer r.mu.RUnlock()

	list := make([]Template, 0, len(r.templates))
	for _, t := range r.templates {
		list = append(list, *t)
	}
	return list
}

// Get retrieves a template by its ID.
func (r *Repository) Get(id string) (*Template, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	tmpl, ok := r.templates[id]
	if !ok {
		return nil, fmt.Errorf("template %s not found", id)
	}
	return tmpl, nil
}
