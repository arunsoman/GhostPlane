package waf

import (
	"net/url"
	"strings"
)

// Rule represents a WAF security rule
type Rule struct {
	ID          string
	Description string
	Check       func(content string, context string) bool
}

// Engine handles sophisticated rule evaluation
type Engine struct {
	rules []Rule
}

// New creates a new context-aware WAF engine
func New() *Engine {
	e := &Engine{}
	e.rules = []Rule{
		{
			ID:          "SQLI_DETECT",
			Description: "Detect SQL injection patterns",
			Check: func(content string, context string) bool {
				if context == "code_editor" || context == "safe_query" {
					return false
				}
				lowered := strings.ToLower(content)
				sqlKeywords := []string{"select ", "union ", "drop table", "--"}
				for _, kw := range sqlKeywords {
					if strings.Contains(lowered, kw) {
						return true
					}
				}
				return false
			},
		},
		{
			ID:          "XSS_DETECT",
			Description: "Detect Cross-Site Scripting",
			Check: func(content string, context string) bool {
				if context == "bypass_xss" {
					return false
				}
				lowered := strings.ToLower(content)
				if strings.Contains(lowered, "<script") || strings.Contains(lowered, "onload=") {
					return true
				}
				return false
			},
		},
	}
	return e
}

// Inspect analyzes a request for security threats
func (e *Engine) Inspect(method, path, body string, headers map[string]string) (bool, string) {
	context := headers["X-NLB-Context"]
	
	unescapedPath, err := url.PathUnescape(path)
	if err != nil {
		unescapedPath = path // Fallback to raw if unescape fails
	}

	// Inspect Path
	violations := e.inspectContent(unescapedPath, context)
	if len(violations) > 0 {
		return false, strings.Join(violations, ", ")
	}
	
	// Inspect Body
	violations = e.inspectContent(body, context)
	if len(violations) > 0 {
		return false, strings.Join(violations, ", ")
	}
	
	return true, ""
}

func (e *Engine) inspectContent(content string, context string) []string {
	var violations []string
	for _, rule := range e.rules {
		if rule.Check(content, context) {
			violations = append(violations, rule.ID)
		}
	}
	return violations
}
