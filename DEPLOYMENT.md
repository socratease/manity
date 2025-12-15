# Deployment Guide

This guide covers deploying Manity with persistent data storage.

## Prerequisites

- Node.js 20+ for frontend
- Python 3.11+ for backend
- Git for version control

## Local Development

### Backend Setup

1. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Configure database (optional):
```bash
cp .env.example .env
# Edit .env to customize DATABASE_URL if needed
```

3. Run backend:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Run tests:
```bash
npm run test
```

## Testing Before Deployment

### Frontend Tests

Run the validation tests for agentic actions:
```bash
npm run test:run
```

All tests must pass before deployment.

### Backend Tests

Run the API and model tests:
```bash
cd backend
python -m pytest test_models.py -v
```

All tests must pass before deployment.

### Manual Testing Checklist

Before deploying, manually test:

- [ ] Create a new project via Momentum tab
- [ ] Add tasks to newly created project in same conversation
- [ ] Verify timeline shows tasks with due dates
- [ ] Check that project data persists after restarting backend
- [ ] Test export/import functionality
- [ ] Verify all CRUD operations work correctly

## Persistent Data Storage

### Local Deployment

On the dev branch, the application stores data in `/home/c17420g/projects/manity-dev-data/portfolio.db` by default. The production branch continues to use `/home/c17420g/projects/manity-data/portfolio.db` unless `DATABASE_URL` is set.

**Important**: The chosen directory must exist and be writable by the backend process.

To change the database location:
```bash
export DATABASE_URL=sqlite:////path/to/your/database.db
```

For a quick dev deployment with the dev database path and ports (`backend: 8113`, `frontend: 8114`), run:
```bash
chmod +x deploy_local_dev.sh
./deploy_local_dev.sh
```

### Cloud Deployment (Render.com)

The `render.yaml` configuration includes a **persistent disk**:

```yaml
disk:
  name: manity-data
  mountPath: /var/data
  sizeGB: 1

envVars:
  - key: DATABASE_URL
    value: sqlite:////var/data/portfolio.db
```

On startup, the backend will log the resolved SQLite path. During deployment,
check Render logs and confirm you see:

```
Using SQLite database at /var/data/portfolio.db
```

If the path is missing or shows an in-memory database, fix the mount and
environment variables before proceeding. The disk mount ensures data survives
redeployments.

### Other Cloud Platforms

For AWS, GCP, Azure, or other platforms:

1. Create a persistent volume or managed database
2. Set the `DATABASE_URL` environment variable:
   - SQLite: `sqlite:////path/to/persistent/volume/portfolio.db`
   - PostgreSQL: `postgresql://user:password@host:port/database`
3. Ensure the volume is mounted before the backend starts

## Deployment Steps

### 1. Run All Tests

```bash
# Frontend tests
npm run test:run

# Backend tests
cd backend && python -m pytest test_models.py -v
```

### 2. Commit Changes

```bash
git add .
git commit -m "Your commit message"
```

### 3. Push to Remote

```bash
git push origin your-branch-name
```

### 4. Deploy

For Render.com:
- Push will automatically trigger deployment
- Monitor logs for any errors
- Verify disk is mounted at `/var/data`

For manual deployment:
```bash
# Build frontend
npm run build

# Deploy backend
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

## Data Backup

### Automated Backup (Recommended)

Set up a cron job to backup the database:

```bash
# Add to crontab (crontab -e)
0 2 * * * cp /home/c17420g/projects/manity-data/portfolio.db /home/c17420g/projects/manity-data/backups/portfolio-$(date +\%Y\%m\%d).db
```

### Manual Backup

```bash
cp /home/c17420g/projects/manity-data/portfolio.db portfolio.db.backup
```

### Export via API

Use the export endpoint:
```bash
curl http://localhost:8000/export > backup.json
```

## Troubleshooting

### Timeline Shows No Tasks

1. Check that subtasks have `dueDate` set
2. Verify due dates fall within visible timeline range
3. Check browser console for errors
4. Verify API returns full project data with subtasks

### "Skipped action: unknown project" Error

This should be fixed in the latest version. If you still see it:

1. Make sure you're on the latest code
2. Check that validation allows referencing newly created projects
3. Review Momentum tab console logs

### Database Not Persisting

1. Check `DATABASE_URL` environment variable
2. Verify persistent volume is mounted
3. Check file permissions on data directory
4. Review backend startup logs

## Migration to PostgreSQL

For production, consider migrating to PostgreSQL:

1. Install PostgreSQL dependencies:
```bash
pip install psycopg2-binary
```

2. Create PostgreSQL database:
```bash
createdb manity
```

3. Update `DATABASE_URL`:
```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/manity
```

4. Migrate data using export/import endpoints

## Security Notes

- Never commit `.env` files to version control
- Keep `OPENAI_API_KEY` secret
- Use strong database passwords for PostgreSQL
- Enable SSL/TLS for production deployments
- Regularly backup your data
