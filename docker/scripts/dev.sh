#!/bin/bash

# Development Docker script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting ProjectXS Task Management in Development Mode...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found!${NC}"
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}.env file created. Please update it with your configuration.${NC}"
        exit 1
    else
        echo -e "${RED}Error: .env.example file not found!${NC}"
        exit 1
    fi
fi

# Build and start the development container
echo -e "${GREEN}Building development image...${NC}"
docker-compose -f docker-compose.dev.yml build

echo -e "${GREEN}Starting development container...${NC}"
docker-compose -f docker-compose.dev.yml up

# Cleanup on exit
trap "echo -e '${YELLOW}Stopping development container...${NC}' && docker-compose -f docker-compose.dev.yml down" EXIT