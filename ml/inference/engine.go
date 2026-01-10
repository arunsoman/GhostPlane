package inference

// Engine runs ONNX models
type Engine struct {
	modelPath string
}

func New(modelPath string) *Engine {
	return &Engine{modelPath: modelPath}
}

func (e *Engine) Predict(features []float32) (float32, error) {
	// TODO: Run ONNX inference
	return 0.95, nil
}
