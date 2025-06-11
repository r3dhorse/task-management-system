#!/bin/bash

# ProjectXS Task Management Docker Monitor Script
# This script monitors the Docker container and restarts it if needed

PROJECT_DIR="/root/projectxs-task-management"
CONTAINER_NAME="projectxs-task-management_projectxs-task-management_1"
HEALTH_URL="http://localhost:3000/api/health"
LOG_FILE="/var/log/projectxs-monitor.log"

# Function to log messages with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check if container is running
check_container() {
    docker ps --format "table {{.Names}}" | grep -q "$CONTAINER_NAME"
    return $?
}

# Function to check health endpoint
check_health() {
    curl -f -s "$HEALTH_URL" > /dev/null 2>&1
    return $?
}

# Function to restart the application
restart_application() {
    log_message "Restarting ProjectXS Task Management application..."
    cd "$PROJECT_DIR"
    
    # Stop the application
    docker-compose down
    
    # Wait a moment
    sleep 5
    
    # Start the application
    docker-compose up -d
    
    # Wait for startup
    sleep 30
    
    if check_container && check_health; then
        log_message "Application restarted successfully"
    else
        log_message "ERROR: Application failed to restart properly"
    fi
}

# Main monitoring logic
main() {
    log_message "Starting ProjectXS monitoring check..."
    
    # Check if container is running
    if ! check_container; then
        log_message "WARNING: Container is not running"
        restart_application
        return
    fi
    
    # Check if health endpoint responds
    if ! check_health; then
        log_message "WARNING: Health check failed"
        restart_application
        return
    fi
    
    log_message "Application is healthy"
}

# Run the main function
main