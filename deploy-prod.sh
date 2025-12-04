#!/bin/bash

# =============================================================================
# Production Deployment Script - Task Management System
# =============================================================================
# This script handles the complete production deployment process
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_msg() {
    echo -e "${2:-$BLUE}$1${NC}"
}

print_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

# Header
echo ""
print_msg "=============================================" "$GREEN"
print_msg "  Task Management System - Production Deploy" "$GREEN"
print_msg "=============================================" "$GREEN"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root. Consider using a non-root user with docker permissions."
fi

# Check required files
print_msg "Checking required files..."

if [ ! -f ".env.production" ]; then
    print_error ".env.production not found!"
    print_msg "Please copy .env.production.example to .env.production and fill in the values."
    print_msg "  cp .env.production.example .env.production"
    print_msg "  nano .env.production"
    exit 1
fi

if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "docker-compose.prod.yml not found!"
    exit 1
fi

if [ ! -f "Dockerfile" ]; then
    print_error "Dockerfile not found!"
    exit 1
fi

print_success "All required files found!"
echo ""

# Load environment variables for validation
print_msg "Validating environment variables..."
source .env.production

# Check required variables
REQUIRED_VARS=(
    "POSTGRES_PASSWORD"
    "NEXTAUTH_URL"
    "NEXTAUTH_SECRET"
    "NEXT_PUBLIC_APP_URL"
)

missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

# Check if NEXTAUTH_SECRET is the default placeholder
if [[ "$NEXTAUTH_SECRET" == *"CHANGE_THIS"* ]] || [[ "$NEXTAUTH_SECRET" == *"GENERATE"* ]]; then
    print_error "NEXTAUTH_SECRET appears to be a placeholder. Please generate a secure secret:"
    print_msg "  openssl rand -base64 32"
    exit 1
fi

# Check if POSTGRES_PASSWORD is the default placeholder
if [[ "$POSTGRES_PASSWORD" == *"CHANGE_THIS"* ]]; then
    print_error "POSTGRES_PASSWORD appears to be a placeholder. Please set a secure password."
    exit 1
fi

print_success "Environment variables validated!"
echo ""

# Create required directories
print_msg "Creating required directories..."
mkdir -p nginx/conf.d
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p backups
print_success "Directories created!"
echo ""

# Check if this is first deployment (no SSL yet)
FIRST_DEPLOY=false
if [ ! -d "certbot/conf/live" ]; then
    FIRST_DEPLOY=true
    print_warning "No SSL certificates found. Using HTTP-only configuration for initial setup."

    # Use initial HTTP-only config
    if [ -f "nginx/conf.d/app-initial.conf.template" ]; then
        cp nginx/conf.d/app-initial.conf.template nginx/conf.d/app.conf
        print_msg "Using HTTP-only nginx configuration"
    fi
fi
echo ""

# Parse command line arguments
ACTION=${1:-deploy}

case $ACTION in
    deploy)
        print_msg "Starting deployment..."
        echo ""

        # Stop existing containers
        print_msg "Stopping existing containers..."
        docker compose -f docker-compose.prod.yml --env-file .env.production down || true
        echo ""

        # Build new images
        print_msg "Building application image..."
        docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache app
        echo ""

        # Start services
        print_msg "Starting services..."
        docker compose -f docker-compose.prod.yml --env-file .env.production up -d
        echo ""

        # Wait for services to be healthy
        print_msg "Waiting for services to be healthy..."
        sleep 10

        # Check service status
        print_msg "Checking service status..."
        docker compose -f docker-compose.prod.yml ps
        echo ""

        # Show logs for cron initialization
        print_msg "Checking cron job initialization..."
        docker logs tms-app-prod 2>&1 | grep -i "cron" | tail -10 || true
        echo ""

        if [ "$FIRST_DEPLOY" = true ]; then
            print_warning "============================================="
            print_warning "IMPORTANT: SSL Setup Required"
            print_warning "============================================="
            print_msg "Run the following to obtain SSL certificates:"
            print_msg ""
            print_msg "  ./deploy-prod.sh ssl"
            print_msg ""
            print_msg "Make sure your domain DNS is pointing to this server first!"
            echo ""
        fi

        print_success "============================================="
        print_success "Deployment completed successfully!"
        print_success "============================================="
        print_msg "Application is running at: ${NEXTAUTH_URL}"
        echo ""
        ;;

    ssl)
        print_msg "Setting up SSL certificates..."

        if [ -z "$DOMAIN" ]; then
            print_error "DOMAIN not set in .env.production"
            exit 1
        fi

        if [ -z "$SSL_EMAIL" ]; then
            print_error "SSL_EMAIL not set in .env.production"
            exit 1
        fi

        # Make sure nginx is running
        docker compose -f docker-compose.prod.yml --env-file .env.production up -d nginx

        # Request certificate
        print_msg "Requesting SSL certificate for $DOMAIN..."
        docker compose -f docker-compose.prod.yml --env-file .env.production run --rm certbot \
            certonly --webroot \
            --webroot-path=/var/www/certbot \
            --email "$SSL_EMAIL" \
            --agree-tos \
            --no-eff-email \
            -d "$DOMAIN"

        if [ $? -eq 0 ]; then
            print_success "SSL certificate obtained successfully!"

            # Update nginx config to use SSL
            print_msg "Updating nginx configuration for SSL..."

            # Replace domain placeholder in app.conf
            sed -i "s/\${DOMAIN:-localhost}/$DOMAIN/g" nginx/conf.d/app.conf

            # Restart nginx
            docker compose -f docker-compose.prod.yml --env-file .env.production restart nginx

            print_success "SSL setup complete!"
            print_msg "Your site is now available at: https://$DOMAIN"
        else
            print_error "Failed to obtain SSL certificate"
            print_msg "Make sure:"
            print_msg "  1. Your domain DNS is pointing to this server"
            print_msg "  2. Port 80 is accessible from the internet"
            print_msg "  3. The domain is correct in .env.production"
        fi
        ;;

    logs)
        print_msg "Showing logs..."
        docker compose -f docker-compose.prod.yml --env-file .env.production logs -f ${2:-}
        ;;

    status)
        print_msg "Service status:"
        docker compose -f docker-compose.prod.yml --env-file .env.production ps
        echo ""
        print_msg "Cron job status:"
        docker logs tms-app-prod 2>&1 | grep -i "cron" | tail -20 || true
        ;;

    restart)
        print_msg "Restarting services..."
        docker compose -f docker-compose.prod.yml --env-file .env.production restart ${2:-}
        print_success "Services restarted!"
        ;;

    stop)
        print_msg "Stopping services..."
        docker compose -f docker-compose.prod.yml --env-file .env.production down
        print_success "Services stopped!"
        ;;

    backup)
        print_msg "Creating manual database backup..."
        timestamp=$(date +%Y%m%d_%H%M%S)
        backup_file="backups/manual_backup_${timestamp}.sql.gz"

        docker exec tms-db-prod pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-task_management} | gzip > "$backup_file"

        if [ $? -eq 0 ]; then
            print_success "Backup created: $backup_file"
        else
            print_error "Backup failed!"
        fi
        ;;

    update)
        print_msg "Updating application..."

        # Pull latest code (if using git)
        if [ -d ".git" ]; then
            print_msg "Pulling latest code..."
            git pull
        fi

        # Rebuild and restart
        print_msg "Rebuilding application..."
        docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache app

        print_msg "Restarting application..."
        docker compose -f docker-compose.prod.yml --env-file .env.production up -d app

        print_success "Update complete!"
        ;;

    *)
        print_msg "Usage: $0 {deploy|ssl|logs|status|restart|stop|backup|update}"
        print_msg ""
        print_msg "Commands:"
        print_msg "  deploy  - Full deployment (build and start all services)"
        print_msg "  ssl     - Set up SSL certificates with Let's Encrypt"
        print_msg "  logs    - Show logs (optionally specify service: logs app)"
        print_msg "  status  - Show service status and cron job info"
        print_msg "  restart - Restart services (optionally specify: restart app)"
        print_msg "  stop    - Stop all services"
        print_msg "  backup  - Create manual database backup"
        print_msg "  update  - Pull latest code and redeploy app"
        exit 1
        ;;
esac
