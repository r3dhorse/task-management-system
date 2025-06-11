#!/bin/bash

# Simple health check script for Docker
# Used by Docker HEALTHCHECK instruction

set -e

# Try to curl the health endpoint
curl -f http://localhost:3000/api/health || exit 1