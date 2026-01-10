package waf

import (
	"testing"
)

func TestEngine_Inspect(t *testing.T) {
	e := New()

	tests := []struct {
		name       string
		method     string
		path       string
		body       string
		headers    map[string]string
		wantPass   bool
		violations string
	}{
		{
			name:     "SQLi in body",
			method:   "POST",
			path:     "/login",
			body:     "user=admin' UNION SELECT",
			headers:  map[string]string{"X-NLB-Context": "login_form"},
			wantPass: false,
		},
		{
			name:     "SQLi in path",
			method:   "GET",
			path:     "/api/select%20from%20users",
			body:     "",
			headers:  map[string]string{"X-NLB-Context": "api_request"},
			wantPass: false,
		},
		{
			name:     "SQLi in safe context",
			method:   "POST",
			path:     "/query",
			body:     "SELECT * FROM users",
			headers:  map[string]string{"X-NLB-Context": "safe_query"},
			wantPass: true,
		},
		{
			name:     "XSS in body",
			method:   "POST",
			path:     "/comment",
			body:     "<script>alert(1)</script>",
			headers:  nil,
			wantPass: false,
		},
		{
			name:     "Malformed path",
			method:   "GET",
			path:     "/api/%G",
			body:     "",
			headers:  nil,
			wantPass: true,
		},
		{
			name:     "Clean request",
			method:   "GET",
			path:     "/",
			body:     "",
			headers:  nil,
			wantPass: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pass, viols := e.Inspect(tt.method, tt.path, tt.body, tt.headers)
			if pass != tt.wantPass {
				t.Errorf("Inspect() pass = %v, want %v (violations: %s)", pass, tt.wantPass, viols)
			}
		})
	}
}
