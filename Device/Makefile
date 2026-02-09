# Vision Capture Service Makefile

.PHONY: help install run test clean docker-build docker-run docker-stop

# Default target
help:
	@echo "Vision Capture Service - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  install     - Install dependencies"
	@echo "  run         - Run service in development mode"
	@echo "  test        - Run tests"
	@echo "  clean       - Clean temporary files"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run with Docker Compose"
	@echo "  docker-stop  - Stop Docker services"
	@echo ""
	@echo "Utilities:"
	@echo "  logs        - View service logs"
	@echo "  health      - Check service health"

# Development commands
install:
	pip install -r requirements.txt

run:
	python run.py

test:
	pytest tests/ -v

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache/
	rm -rf .coverage
	rm -rf htmlcov/

# Docker commands
docker-build:
	docker build -t vision-capture-service .

docker-run:
	docker-compose up --build -d

docker-stop:
	docker-compose down

# Utility commands
logs:
	tail -f logs/vision-capture.log

health:
	curl -f http://localhost:6407/api/v1/capture/health || echo "Service not running"

# Environment setup
setup-env:
	cp env.example .env
	@echo "Environment file created. Please edit .env with your configuration."

# Development setup
dev-setup: setup-env install
	@echo "Development environment setup complete!"
	@echo "Run 'make run' to start the service"
