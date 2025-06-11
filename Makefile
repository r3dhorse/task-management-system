# Makefile for ProjectXS Task Management

.PHONY: help dev prod build clean logs status restart

# Default target
help:
	@echo "ProjectXS Task Management - Docker Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  dev        Start development environment with hot-reloading"
	@echo "  prod       Start production environment"
	@echo "  build      Build production Docker image"
	@echo "  clean      Clean up Docker resources"
	@echo "  logs       Show container logs"
	@echo "  status     Show container status"
	@echo "  restart    Restart containers"
	@echo "  stop       Stop all containers"

# Development environment
dev:
	@./docker/scripts/dev.sh

# Production environment
prod:
	@./docker/scripts/prod.sh

# Build production image
build:
	@./docker/scripts/build.sh prod

# Clean Docker resources
clean:
	@./docker/scripts/clean.sh

# Show logs
logs:
	@docker-compose logs -f --tail=100

# Show status
status:
	@docker-compose ps

# Restart containers
restart:
	@docker-compose restart

# Stop containers
stop:
	@docker-compose down