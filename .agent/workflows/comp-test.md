---
description: Comprehensive Testing & Sprint Completion Workflow
---

# Comprehensive Testing Workflow

Every sprint must adhere to the following testing standards before being marked as complete.

## 1. Test-to-Source Ratio
- For every source file `pkg/foo/bar.go`, there MUST be a corresponding test file `pkg/foo/bar_test.go`.
- For Python files `src/foo.py`, there MUST be a `tests/test_foo.py`.

## 2. Coverage Requirements
- **100% Line Coverage**: Every line of the file being tested must be executed at least once during the test suite.
- If 100% coverage is technically impossible (e.g., unreachable error paths in external libraries), it must be documented in a comment within the test file.

## 3. Sprint Completion Steps

### Step A: Generate Coverage Report
Run the following command in the project root:
```bash
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out
```

// turbo
### Step B: Identify Missing Coverage
Check for any files with < 100% coverage.
```bash
# Example to find files with less than 100% coverage
go tool cover -func=coverage.out | grep -v "100.0%"
```

### Step C: Backfill Tests
Add test cases to address missing branches, error conditions, and edge cases.

### Step D: Verification
Run the full test suite one last time.
// turbo
```bash
make test
```

## 4. Documentation
Update the `walkthrough.md` with the coverage results for the sprint.
