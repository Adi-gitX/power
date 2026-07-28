# Supabase Database Integration Playbook

This playbook is ONLY for using Supabase as a PostgreSQL database. It does NOT cover Supabase Auth or Supabase Storage. If user needs auth or file storage from Supabase, this is NOT the right playbook.

Purpose: Use Supabase as a PostgreSQL database with Python/FastAPI backend

Scope: Database operations only (CRUD). No authentication or file storage.

What this playbook covers:
- Supabase PostgreSQL database (table creation, CRUD operations, queries)

What this playbook does NOT cover:
- Supabase Auth
- Supabase Blob Storage

---

## Required Setup

### 1. Get Connection String from the user

Transaction Pooler URI (REQUIRED):
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

HOW TO GET THE CORRECT URI:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select Your Project
3. Click "Connect"
4. Select "Transaction Pooler" option in the method type (NOT "Direct Connection" or "Session Pooler")
5. Copy the connection string

CRITICAL: Connection URI Validation

The user MUST provide a Transaction Pooler connection string. DO NOT proceed with direct connection URIs.

STOP and ask for Transaction Pooler URI if you see:

- Host pattern: `db.[PROJECT_REF].supabase.co` (Direct connection - WRONG)
- Port: `5432` (Direct connection - WRONG)
- Port: `6543` with host pattern `aws-0-[REGION].pooler.supabase.com` (Transaction Pooler - CORRECT)

Direct Connection URI (DO NOT USE - will fail with IPv4 errors):

This will cause "could not translate host name" errors `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`

IF USER PROVIDES WRONG URI:

- STOP immediately
- Explain: "This is a direct connection URI which will fail with IPv4 network errors"
- Ask: "Please provide the Transaction Pooler connection string from Supabase Dashboard → Connect → Transaction Pooler tab"
- DO NOT proceed until correct URI is provided

### 2. Environment & Dependencies

```bash
# /app/backend/.env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

```bash
pip install sqlalchemy[asyncio] asyncpg alembic python-dotenv
pip freeze > requirements.txt
```

Restart the backend server after installation.

---

## Database Configuration

```python
# /app/backend/database.py

load_dotenv(Path(__file__).parent / '.env')
DATABASE_URL = os.environ.get('DATABASE_URL')
ASYNC_DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://')

engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_size=10,
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=False,
    echo=False,
    connect_args={
        "statement_cache_size": 0,  # CRITICAL: Required for transaction pooler
        "command_timeout": 30,
    }
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

---

## CRITICAL: Schema Management with Alembic (NON-NEGOTIABLE)

NEVER use `Base.metadata.create_all()` in application code. This approach:

- Cannot modify existing tables (add/remove columns)
- Has no rollback capability
- Doesn't track schema history
- Causes issues in production deployments

ALWAYS USE ALEMBIC FOR ALL SCHEMA CHANGES.

## Alembic Setup (Required - Do This First)

```
cd /app/backend
alembic init alembic                                  # First time only
alembic revision --autogenerate -m "description"      # Generate migration
alembic upgrade head                                  # Apply migrations
alembic downgrade -1                                  # Rollback one migration
```

CONFIGURE alembic/env.py TO:

- Load sync DATABASE_URL from .env (without +asyncpg)
- Import Base.metadata from models

---

## Quick Reference: Example Models & CRUD

```python
# /app/backend/models.py — Define models with indexed columns
class User(Base):
    __tablename__ = 'users'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)  # index for WHERE
    posts = relationship('Post', back_populates='author', cascade='all, delete-orphan')

class Post(Base):
    __tablename__ = 'posts'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    author_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), index=True)
    published = Column(Boolean, default=False, index=True)  # index for filtering
    author = relationship('User', back_populates='posts')


# /app/backend/main.py — Async CRUD operations

# CREATE
user = User(**data.model_dump())
db.add(user)
await db.commit()
await db.refresh(user)

# READ (with eager loading to avoid N+1)
result = await db.execute(
    select(Post)
    .options(selectinload(Post.author))
    .where(Post.published == True)
    .order_by(Post.created_at.desc())
)
posts = result.scalars().all()

# UPDATE
result = await db.execute(select(Post).where(Post.id == post_id))
post = result.scalar_one_or_none()
post.published = True
await db.commit()

# DELETE
await db.delete(user)
await db.commit()
```

---

## Common Issues

### 1. "prepared statement does not exist"
Cause: Transaction pooler doesn't support prepared statements.
Fix: Ensure `statement_cache_size: 0` is set in connect_args.

### 2. "could not translate host name to address: No address associated with hostname"
Error: `psycopg2.OperationalError: could not translate host name "db.[PROJECT_REF].supabase.co" to address`
Cause: Using direct connection URI (`db.[PROJECT_REF].supabase.co:5432`) which requires IPv4 or IPv6 add-on.
Fix: MUST use Transaction Pooler URI (`aws-0-[REGION].pooler.supabase.com:6543`). The direct connection URL will NOT work without purchasing IPv4 add-on. See "Required Setup" section for correct URI format.

### 3. Connection refused / DNS errors
Cause: Using direct DB URL instead of pooler.
Fix: Use Transaction Pooler URL (port 6543), not direct connection (5432).

### 4. Slow first request (4-7s)
Cause: Cold connection pool + network latency.
Fix: Keep `pool_size >= 5`, deploy backend closer to Supabase region.

### 5. Extra queries after commit
Cause: SQLAlchemy refreshes objects by default.
Fix: Ensure `expire_on_commit=False` in session config.

### 6. N+1 queries
Cause: Lazy loading relationships in loops.
Fix: Use `selectinload()` or `joinedload()` for eager loading.

### 7. Alembic async errors
Cause: Alembic runs synchronously but got async URL.
Fix: Use sync `DATABASE_URL` in env.py (without `+asyncpg`). The conversion to async happens only in database.py.

### 8. RLS blocking all queries
Cause: Row Level Security enabled without policies.
Fix: RLS is disabled by default for new tables. If you enabled it and supabase Auth was not used in the project, either disable it or add permissive policies in Supabase dashboard.

### 9. Alembic "No module named 'psycopg2'" error
Cause: Alembic requires a sync database driver.
Fix: `pip install psycopg2-binary`


### Pooler Type Reference
- Transaction Pooler (port 6543): Use this. Best for serverless and short-lived transactions.
- Session Pooler (port 5432): For long-lived connections needing session state. Not recommended for typical FastAPI apps.

---

## Critical Rules (NON-NEGOTIABLE)

1. Never drop all tables — destroys data permanently
2. All schema changes via Alembic — keeps changes tracked and reversible
3. Never use `Base.metadata.create_all()` — always use Alembic migrations for table creation

---

## MANDATORY SETUP CHECKLIST (IMPORTANT)

1. Obtain Transaction Pooler URI from user (port 6543, NOT 5432)
2. Validate the URI format matches: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
3. Add DATABASE_URL to /app/backend/.env
4. Install dependencies: sqlalchemy[asyncio] asyncpg alembic psycopg2-binary python-dotenv
5. Create /app/backend/database.py with CORRECT configuration
6. `statement_cache_size=0` in connect_args
7. `expire_on_commit=False` in session config
8. Run: cd /app/backend && alembic init alembic
9. Configure alembic/env.py to load DATABASE_URL and import Base.metadata
10. Create models in /app/backend/models.py
11. Generate migration: alembic revision --autogenerate -m "Initial schema"
12. Apply migration: alembic upgrade head
13. Verify: alembic current shows the migration as applied
14. Indexes on columns used in WHERE/ORDER BY
15. `selectinload()` used for relationship queries

DO NOT SKIP ANY STEP. DO NOT PROCEED TO THE NEXT STEP UNTIL THE CURRENT ONE IS COMPLETE.
