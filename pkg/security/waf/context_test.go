package waf

import (
	"testing"
)

func TestContextAnalyzer_AnalyzeContext(t *testing.T) {
	ca := &ContextAnalyzer{}
	ctx := ca.AnalyzeContext(nil)
	if ctx != "generic" {
		t.Errorf("Expected generic, got %s", ctx)
	}
}
