package shadow

// Comparator compares the responses from shadow mode
type Comparator struct{}

func (c *Comparator) Compare(respA, respB []byte) (diff string, match bool) {
	// TODO: Compare status codes, headers, and bodies
	return "", true
}
