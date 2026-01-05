# Database Migration Guide

## Unique Constraints Migration (v1)

### Overview

This migration adds UNIQUE constraints to `project.name` and `person.name` columns to ensure data integrity and prevent duplicate entries. This is a critical migration required when merging the `dev` branch into `main`.

### What This Migration Does

1. **Adds UNIQUE constraint to `project.name`**
   - Checks for existing duplicate project names (case-insensitive)
   - Resolves duplicates by appending numeric suffixes: `"Project Name (2)"`, `"Project Name (3)"`, etc.
   - Recreates the `project` table with the UNIQUE constraint
   - Preserves all data and relationships

2. **Adds UNIQUE constraint to `person.name`**
   - Checks for existing duplicate person names (case-insensitive)
   - **Merges** duplicate person records into a single record
   - Updates all foreign key references (tasks, subtasks, activities, project stakeholders) to point to the merged person
   - Recreates the `person` table with the UNIQUE constraint

3. **Tracks migration state**
   - Uses the `MigrationState` table to ensure the migration only runs once
   - Safe to run multiple times - will skip if already applied

### When Does This Migration Run?

The migration runs automatically on application startup if it hasn't been applied yet.

You can also run it manually before starting the server:

```bash
python backend/main.py run-unique-constraints-migration
```

For production environments (requires admin token):

```bash
python backend/main.py run-unique-constraints-migration --admin-token YOUR_ADMIN_TOKEN
```

Or use the environment variable:

```bash
export MANITY_ADMIN_TOKEN=your_token_here
python backend/main.py run-unique-constraints-migration
```

### Migration Safety

This migration is designed to be **safe and non-destructive**:

- ✅ **Idempotent**: Can be run multiple times safely
- ✅ **Data preservation**: No data is lost
- ✅ **Duplicate handling**: Automatically resolves conflicts
- ✅ **Foreign key integrity**: All relationships are maintained
- ✅ **Rollback capable**: Uses transactions where possible

### Important Notes

#### For Project Names

If you have duplicate project names like:
- "Website Redesign"
- "Website Redesign"
- "Website Redesign"

They will be renamed to:
- "Website Redesign" (first one unchanged)
- "Website Redesign (2)"
- "Website Redesign (3)"

You may want to manually rename these to more descriptive names after the migration.

#### For Person Names

If you have duplicate person entries like:
- Person A: John Smith (john@example.com) - assigned to 3 tasks
- Person B: John Smith (jsmith@example.com) - assigned to 2 tasks

The migration will:
1. Keep the first record (john@example.com)
2. Update all 5 task assignments to point to the kept record
3. Delete the duplicate record

**Review your people records** after migration to ensure the correct contact information was retained.

### Verification Steps

After the migration runs, verify the results:

1. **Check the logs** for migration messages:
   ```
   INFO:__main__:Running migration: add-unique-constraints-v1
   INFO:__main__:Adding UNIQUE constraint to project.name
   INFO:__main__:Successfully added UNIQUE constraint to project.name
   INFO:__main__:Adding UNIQUE constraint to person.name
   INFO:__main__:Successfully added UNIQUE constraint to person.name
   INFO:__main__:Migration add-unique-constraints-v1 completed successfully
   ```

2. **Query the database** to check for the constraints:
   ```sql
   -- Check project table schema
   SELECT sql FROM sqlite_master WHERE type='table' AND name='project';

   -- Check person table schema
   SELECT sql FROM sqlite_master WHERE type='table' AND name='person';
   ```

3. **Verify no duplicates remain**:
   ```sql
   -- Should return no rows
   SELECT name, COUNT(*) FROM project GROUP BY LOWER(name) HAVING COUNT(*) > 1;
   SELECT name, COUNT(*) FROM person GROUP BY LOWER(name) HAVING COUNT(*) > 1;
   ```

4. **Test creating duplicate names** (should fail):
   ```bash
   curl -X POST http://localhost:8000/projects \
     -H "Content-Type: application/json" \
     -d '{"name": "Existing Project Name", ...}'
   # Should return 400 Bad Request with "A project with that name already exists"
   ```

### Troubleshooting

#### Migration doesn't run

**Problem**: Migration marked as complete but constraints not added

**Solution**: Check if constraints were already present:
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='project';
```

If constraints exist, the migration correctly skipped. If not, manually remove the migration state and re-run:
```sql
DELETE FROM migrationstate WHERE key='add-unique-constraints-v1';
```

#### Foreign key errors during migration

**Problem**: Foreign key constraint violations

**Solution**: The migration temporarily disables foreign key checks. If you see errors:
1. Ensure no other processes are accessing the database
2. Check that all referenced tables exist
3. Verify database isn't corrupted: `PRAGMA integrity_check;`

#### Application errors after migration

**Problem**: Application failing to create projects/people

**Cause**: Frontend may be sending duplicate names

**Solution**:
1. Check application logs for specific error messages
2. Ensure frontend validates names for uniqueness before submission
3. The backend will now reject duplicate names with clear error messages

### Database Schema Changes

#### Before Migration

```sql
CREATE TABLE project (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    -- ... other columns
);

CREATE TABLE person (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    -- ... other columns
);
```

#### After Migration

```sql
CREATE TABLE project (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,  -- ← UNIQUE constraint added
    -- ... other columns
);
CREATE INDEX ix_project_name ON project (name);

CREATE TABLE person (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,  -- ← UNIQUE constraint added
    -- ... other columns
);
CREATE INDEX ix_person_name ON person (name);
```

### Rollback Procedure

If you need to rollback this migration:

1. **Backup your database first!**

2. Remove the UNIQUE constraints manually:
   ```sql
   -- For project table
   CREATE TABLE project_old AS SELECT * FROM project;
   DROP TABLE project;
   CREATE TABLE project (
       id TEXT PRIMARY KEY,
       name TEXT NOT NULL,
       -- ... other columns (without UNIQUE)
   );
   INSERT INTO project SELECT * FROM project_old;
   DROP TABLE project_old;

   -- Repeat similar process for person table
   ```

3. Remove the migration state:
   ```sql
   DELETE FROM migrationstate WHERE key='add-unique-constraints-v1';
   ```

### Additional Migrations

This migration script also handles:

- Column additions via `ensure_column()` calls in `create_db_and_tables()`
- People relationship migrations via `migrate_people_links()`
- People backfill migrations via `run_people_backfill()`

All migrations are tracked and will only run once.

## Summary

This migration is **required** for the dev→main merge and will:
- ✅ Add database-level uniqueness constraints
- ✅ Prevent duplicate project/person names
- ✅ Maintain all existing data and relationships
- ✅ Run automatically on first startup after merge

**No manual intervention required** unless you have duplicate data that you want to review after migration.
