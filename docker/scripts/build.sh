#!/bin/bash

# Docker build script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
BUILD_TYPE=${1:-prod}
NO_CACHE=${2:-false}

echo -e "${GREEN}Building ProjectXS Task Management Docker Image...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found!${NC}"
    echo -e "${YELLOW}Build will continue but runtime may fail without proper configuration.${NC}"
fi

# Build based on type
if [ "$BUILD_TYPE" = "dev" ]; then
    echo -e "${GREEN}Building development image...${NC}"
    if [ "$NO_CACHE" = "no-cache" ]; then
        docker-compose -f docker-compose.dev.yml build --no-cache
    else
        docker-compose -f docker-compose.dev.yml build
    fi
else
    echo -e "${GREEN}Building production image...${NC}"
    if [ "$NO_CACHE" = "no-cache" ]; then
        docker-compose build --no-cache
    else
        docker-compose build
    fi
fi

echo -e "${GREEN}Build complete!${NC}"

# Show image info
echo -e "${GREEN}Docker images:${NC}"
docker images | grep projectxs