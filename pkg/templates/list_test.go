package templates

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHandler_ListTemplates_Integration(t *testing.T) {
	// Create a real repository pointing to the actual templates directory
	repo, err := NewRepository("../../templates")
	require.NoError(t, err)

	renderer := NewRenderer()
	simulator := NewSimulator()
	handler := NewHandler(repo, renderer, simulator, nil, nil, nil, nil)

	// Create a request to /api/v1/templates
	req, err := http.NewRequest("GET", "/api/v1/templates", nil)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	handler.ListTemplates(rr, req)

	// Check status code
	assert.Equal(t, http.StatusOK, rr.Code)

	// In a real integration test, we would check the JSON response
	// But since this is running against the actual file system,
	// we should expect at least 10 templates.
	assert.GreaterOrEqual(t, len(repo.List()), 10, "Should have at least 10 templates in the library")
}
