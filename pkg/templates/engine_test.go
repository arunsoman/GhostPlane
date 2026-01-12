package templates

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTemplateEngine(t *testing.T) {
	// 1. Setup temporary template directory
	tmpDir, err := os.MkdirTemp("", "templates-test")
	require.NoError(t, err)
	defer os.RemoveAll(tmpDir)

	templateContent := `
metadata:
  id: "test-tmpl"
  name: "Test Template"
parameters:
  - name: "target_ip"
    type: "ip_list"
    required: true
configuration: |
  l7_routes:
    - path: "/test"
      targets: {{ .target_ip | json }}
`
	err = os.WriteFile(filepath.Join(tmpDir, "test.yaml"), []byte(templateContent), 0644)
	require.NoError(t, err)

	// 2. Test Repository Loading
	repo, err := NewRepository(tmpDir)
	require.NoError(t, err)

	tmpl, err := repo.Get("test-tmpl")
	require.NoError(t, err)
	assert.Equal(t, "Test Template", tmpl.Metadata.Name)

	// 3. Test Renderer
	renderer := NewRenderer()

	t.Run("Successful Render", func(t *testing.T) {
		params := map[string]interface{}{
			"target_ip": "1.2.3.4",
		}
		cfg, err := renderer.Render(tmpl, params)
		require.NoError(t, err)
		assert.NotNil(t, cfg)
		// Verify rendered value
		assert.Equal(t, "1.2.3.4", cfg.L7Routes[0].Targets[0])
	})

	t.Run("Missing Parameter", func(t *testing.T) {
		params := map[string]interface{}{}
		_, err := renderer.Render(tmpl, params)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "missing required parameter")
	})
}
