# Development Docker Configuration

This directory contains Docker configurations for local development.

## Getting Started

1. Start the services:
   ```bash
   docker-compose up -d
   ```

2. Check service status:
   ```bash
   docker-compose ps
   ```

3. View logs:
   ```bash
   docker-compose logs -f
   ```

4. Stop services:
   ```bash
   docker-compose down
   ```

## Services

- **PostgreSQL**: Port 5432
- **Redis**: Port 6379
- **pgAdmin**: Port 5050 (optional, run with `--profile tools`)

## Access

- PostgreSQL: `postgresql://ylportal:ylportal_dev_password@localhost:5432/ylportal`
- Redis: `redis://localhost:6379`
- pgAdmin: http://localhost:5050 (admin@ylportal.local / admin)
