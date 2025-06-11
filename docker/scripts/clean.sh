#!/bin/bash

# Docker cleanup script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Cleaning up Docker resources for ProjectXS...${NC}"

# Stop and remove containers
echo -e "${GREEN}Stopping containers...${NC}"
docker-compose -f docker-compose.yml down 2>/dev/null || true
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

# Remove images
echo -e "${GREEN}Removing images...${NC}"
docker images | grep projectxs | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

# Remove volumes (optional - commented out by default to preserve data)
# echo -e "${GREEN}Removing volumes...${NC}"
# docker volume ls | grep projectxs | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true

# Prune unused resources
echo -e "${GREEN}Pruning unused Docker resources...${NC}"
docker system prune -f

echo -e "${GREEN}Cleanup complete!${NC}"