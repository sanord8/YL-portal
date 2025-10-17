# YL Portal - Setup Guide

## Prerequisites

- Node.js 20+ LTS
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 15+ (via Docker)
- Redis (via Docker)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Database Services

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis in the background.

### 3. Setup Environment Variables

```bash
cp .env.example apps/backend/.env
```

Edit `apps/backend/.env` and update values as needed.

### 4. Initialize Database

```bash
cd apps/backend
pnpm db:push
pnpm db:seed  # Optional: seed with test data
```

### 5. Start Development Servers

In separate terminals:

**Backend:**
```bash
cd apps/backend
pnpm dev
```

**Frontend:**
```bash
cd apps/frontend
pnpm dev
```

### 6. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Health Check: http://localhost:3000/health

## Development Workflow

### Database Migrations

```bash
cd apps/backend
pnpm db:migrate  # Create and run migration
pnpm db:studio   # Open Prisma Studio
```

### Code Quality

```bash
pnpm lint        # Lint all packages
pnpm format      # Format code with Prettier
```

### Testing

```bash
pnpm test        # Run all tests
```

## Monorepo Structure

- `apps/backend` - Hono API server
- `apps/frontend` - SvelteKit application
- `packages/types` - Shared TypeScript types
- `packages/validation` - Zod validation schemas
- `packages/config` - Shared configuration
- `packages/i18n` - Internationalization

## Troubleshooting

### Database Connection Issues

```bash
docker-compose logs postgres
```

### Redis Connection Issues

```bash
docker-compose logs redis
```

### Port Already in Use

Change ports in:
- `docker-compose.yml` for database services
- `apps/backend/src/index.ts` for backend
- `apps/frontend/vite.config.ts` for frontend

## Next Steps

- Review the [README.md](../README.md) for the full technical roadmap
- Check [Prisma schema](../apps/backend/prisma/schema.prisma) for database structure
- Explore the API at http://localhost:3000/api/v1/hello
