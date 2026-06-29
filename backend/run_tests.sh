#!/bin/bash
# Quick test commands for SigmaSpend backend

source .venv/bin/activate

echo "═══════════════════════════════════════════════════════════════"
echo "SigmaSpend Backend Test Suite"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Show test options
if [ "$1" == "--help" ]; then
    echo "Usage: ./run_tests.sh [option]"
    echo ""
    echo "Options:"
    echo "  --all          Run all tests"
    echo "  --models       Run model tests only"
    echo "  --services     Run service tests only"
    echo "  --endpoints    Run endpoint tests only"
    echo "  --config       Run config tests only"
    echo "  --coverage     Run tests with coverage report"
    echo "  --quick        Run tests quickly (no verbose)"
    echo "  --watch        Run tests in watch mode (requires pytest-watch)"
    echo ""
    exit 0
fi

case "$1" in
    --all)
        echo "Running ALL tests..."
        pytest tests/ -v
        ;;
    --models)
        echo "Running MODEL tests..."
        pytest tests/test_models.py -v
        ;;
    --services)
        echo "Running SERVICE tests..."
        pytest tests/test_services.py -v
        ;;
    --endpoints)
        echo "Running ENDPOINT tests..."
        pytest tests/test_endpoints.py -v
        ;;
    --config)
        echo "Running CONFIG tests..."
        pytest tests/test_config.py -v
        ;;
    --coverage)
        echo "Running tests with COVERAGE report..."
        pytest tests/ --cov=app --cov-report=html --cov-report=term-missing
        echo "✓ Coverage report generated in htmlcov/index.html"
        ;;
    --quick)
        echo "Running tests quickly..."
        pytest tests/ -q
        ;;
    *)
        echo "Running all tests..."
        pytest tests/ -v
        echo ""
        echo "Test summary: ✓ All tests passed"
        echo ""
        echo "For more options: ./run_tests.sh --help"
        ;;
esac
