package waf

// ContextAnalyzer determines the application context
type ContextAnalyzer struct{}

func (ca *ContextAnalyzer) AnalyzeContext(reqHeaders map[string]string) string {
	// TODO: Check logs/metrics to see what kind of app this is
	// e.g., "login_form", "api_endpoint", "dev_tool"
	return "generic"
}
