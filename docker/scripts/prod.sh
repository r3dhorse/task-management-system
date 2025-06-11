#!/bin/bash

# Production Docker script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting ProjectXS Task Management in Production Mode...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please create a .env file with your configuration.${NC}"
    exit 1
fi

# Build the production image
echo -e "${GREEN}Building production image...${NC}"
docker-compose build --no-cache

# Start the production container in detached mode
echo -e "${GREEN}Starting production container...${NC}"
docker-compose up -d

# Show container status
echo -e "${GREEN}Container status:${NC}"
docker-compose ps

# Show logs
echo -e "${GREEN}Container logs (last 50 lines):${NC}"
docker-compose logs --tail=50

echo -e "${GREEN}Production deployment complete!${NC}"
echo -e "${YELLOW}Access the application at: http://localhost:3000${NC}"
echo -e "${YELLOW}To view logs: docker-compose logs -f${NC}"
echo -e "${YELLOW}To stop: docker-compose down${NC}"