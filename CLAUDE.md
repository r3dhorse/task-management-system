# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Commands

```bash
# Development
npm run dev              # Start development server on port 3001
npm run dev:docker       # Docker development with hot reload
./dev.sh                 # Full Docker environment (app + PostgreSQL)

# Database Management
npm run db:generate      # Generate Prisma client after schema changes
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with initial data
npm run db:studio        # Open Prisma Studio GUI
npm run db:fresh         # Reset and rebuild database (dev only)

# User Management
npm run create-superadmin <email> <password> [name]  # Create super-admin user

# Build & Production
npm run build            # Build for production
npm run start            # Start production server
```

## Architecture Overview

This is a **multi-tenant task management system** built with:
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS with shadcn/ui components
- **Backend**: Next.js API routes with PostgreSQL database
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with credentials provider and JWT sessions
- **File Storage**: Local storage with organized folder structure

## Project Structure

The codebase follows a feature-based organization:
- `/src/app/` - Next.js App Router pages and API routes
- `/src/features/` - Feature modules (tasks, workspaces, members, services, notifications)
- `/src/components/` - Shared UI components including shadcn/ui primitives
- `/src/lib/` - Utility functions and configurations
- `/prisma/` - Database schema and migrations

## Database Schema

Core entities with relationships:
- **User** → **Member** → **Workspace** (multi-tenancy)
- **Task** with workflow states: BACKLOG → TODO → IN_PROGRESS → IN_REVIEW → DONE → ARCHIVED
- **Service** categories with SLA tracking
- **TaskHistory** for comprehensive audit trails
- **Notification** system with mentions and real-time updates

Always run `npm run db:generate` after modifying the Prisma schema.

## Authentication & Authorization

Three-tier permission system:
- **Regular users**: Basic workspace access
- **Admin**: Workspace-level administration
- **Super-admin**: System-wide user management

NextAuth configuration in `/src/lib/auth.ts` with 30-day JWT sessions.

## API Endpoints

RESTful APIs under `/api/`:
- `/api/auth/*` - Authentication
- `/api/users/*` - User management (super-admin only)
- `/api/workspaces/*` - Workspace CRUD
- `/api/workspaces/[id]/tasks/*` - Task operations
- `/api/upload/*` - File handling
- `/api/cron/*` - Scheduled notifications

## Key Development Notes

- **Port 3001** for development (configurable in package.json)
- **TypeScript strict mode** is enabled
- **Path aliases**: `@/*` maps to `src/*`
- **Environment variables** required: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
- **Prisma migrations** must be run after schema changes
- **Docker development** includes PostgreSQL container with automatic migrations

## Production Deployment (Docker)

**Deployment Commands:**
```bash
# Configure environment
cp .env.production.example .env.production
nano .env.production

# Deploy application
./deploy-prod.sh deploy

# Setup SSL certificates
./deploy-prod.sh ssl

# Check status and cron jobs
./deploy-prod.sh status

# View logs
./deploy-prod.sh logs app

# Manual database backup
./deploy-prod.sh backup
```

**Required Environment Variables:**
- `POSTGRES_PASSWORD`: Secure database password
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your production domain (e.g., `https://your-domain.com`)
- `NEXT_PUBLIC_APP_URL`: Same as NEXTAUTH_URL
- `DOMAIN`: Your domain for SSL certificate
- `SSL_EMAIL`: Email for Let's Encrypt notifications

**Cron Jobs (Asia/Manila timezone):**
- Midnight: Move overdue tasks to Backlog
- Every 5 minutes: Create routinary (recurring) tasks
- 2 AM: Automated database backup

**Documentation:**
- See `docs/PRODUCTION-DEPLOYMENT.md` for complete deployment guide
- See `docs/CHANGELOG.md` for version history

## Task Workflow Features

- **SLA Management**: Service-level agreements with weekend handling
- **Task Reviews**: Assignee/reviewer workflow with status transitions
- **Confidential Tasks**: Restricted visibility based on assignment
- **File Attachments**: Local storage with access control
- **Task History**: Complete audit trail of all changes
- **Performance KPIs**: Weighted metrics configuration per service

## UI Components

Uses shadcn/ui component library (New York style) with:
- TanStack Query for data fetching
- TanStack Table for data grids
- React Hook Form with Zod validation
- @hello-pangea/dnd for drag-and-drop functionality