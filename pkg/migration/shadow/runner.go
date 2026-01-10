package shadow

// Runner executes request traffic against two configs in parallel
type Runner struct{}

func (r *Runner) RunComparison(trafficSource string, configA, configB string) error {
	// TODO: Replay traffic and compare responses
	return nil
}
