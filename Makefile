.PHONY: all build test lint clean run

all: build

build:
	@echo "Building NLB+..."
	go build -o bin/nlb cmd/nlb/main.go

test:
	@echo "Running Go tests..."
	go test -v -race ./pkg/...
	@echo "Running Python tests..."
	cd copilot && pytest tests/
	@echo "Running UI tests..."
	cd ui && npm test

test-integration:
	@echo "Running integration tests..."
	go test -v ./test/integration/...

test-e2e:
	@echo "Running E2E tests..."
	go test -v ./test/e2e/...

test-chaos:
	@echo "Running chaos engineering tests..."
	go test -v ./test/chaos/...

lint:
	@echo "Linting Go code..."
	golangci-lint run
	@echo "Linting Python code..."
	cd copilot && ruff check src/
	@echo "Linting UI code..."
	cd ui && npm run lint

run:
	@echo "Starting NLB+..."
	./bin/nlb --config config.yaml

clean:
	@echo "Cleaning build artifacts..."
	rm -rf bin/
	rm -rf ui/.next/
	rm -rf copilot/__pycache__/

docker-build:
	@echo "Building Docker image..."
	docker build -t nlb:latest .

deps:
	@echo "Installing Go dependencies..."
	go mod download
	@echo "Installing Python dependencies..."
	cd copilot && pip install -e ".[dev]"
	@echo "Installing UI dependencies..."
	cd ui && npm install
