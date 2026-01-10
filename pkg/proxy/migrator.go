package proxy

import (
	"regexp"
	"strings"
)

// Migrator handles translation of legacy configs to NLB+ routes
type Migrator struct{}

// NewMigrator creates a new migrator instance
func NewMigrator() *Migrator {
	return &Migrator{}
}

// Migrate parses the input and returns NLB+ routes
func (m *Migrator) Migrate(config string) []ConfigRoute {
	// Simple heuristic to detect type
	if strings.Contains(config, "location") && strings.Contains(config, "proxy_pass") {
		return m.ParseNginx(config)
	}
	if strings.Contains(config, "ProxyPass") {
		return m.ParseApache(config)
	}
	return nil
}

// ParseNginx extracts routes from Nginx location blocks
func (m *Migrator) ParseNginx(config string) []ConfigRoute {
	var routes []ConfigRoute

	// Regex for location block: location [modifier] path { ... proxy_pass url; ... }
	// This is a simplified regex that captures the path and proxy_pass
	re := regexp.MustCompile(`location\s+([^{]+)\s*\{[^}]*proxy_pass\s+([^;]+);`)
	matches := re.FindAllStringSubmatch(config, -1)

	for _, match := range matches {
		if len(match) < 3 {
			continue
		}
		path := strings.TrimSpace(match[1])
		target := strings.TrimSpace(match[2])

		// Handle modifiers if any (like ~ or ~* for regex, but we map them to glob or prefix)
		// For now, we strip them and treat as path
		pathParts := strings.Fields(path)
		finalPath := pathParts[len(pathParts)-1]

		routes = append(routes, ConfigRoute{
			Path:     finalPath,
			Targets:  []string{target},
			Priority: 10, // Default priority for migrated routes
		})
	}

	return routes
}

// ParseApache extracts routes from Apache ProxyPass directives
func (m *Migrator) ParseApache(config string) []ConfigRoute {
	var routes []ConfigRoute

	// Regex for ProxyPass: ProxyPass "path" "url"
	re := regexp.MustCompile(`(?i)ProxyPass\s+"?([^"\s]+)"?\s+"?([^"\s]+)"?`)
	matches := re.FindAllStringSubmatch(config, -1)

	for _, match := range matches {
		if len(match) < 3 {
			continue
		}
		path := match[1]
		target := match[2]

		routes = append(routes, ConfigRoute{
			Path:     path,
			Targets:  []string{target},
			Priority: 10,
		})
	}

	return routes
}
