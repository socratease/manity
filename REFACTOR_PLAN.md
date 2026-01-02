# Manity Refactoring Plan

## Executive Summary

This plan addresses critical architectural issues in Manity, focusing on improving modularity, simplifying architecture, removing legacy code, and eliminating vestigial patterns. The codebase has grown organically and reached a tipping point where two "god objects" dominate: `ManityApp.jsx` (10,724 lines) and `main.py` (3,668 lines).

---

## Current State Assessment

### Critical Issues

| File | Size | Problem |
|------|------|---------|
| `ManityApp.jsx` | 10,724 lines | God component with 140+ useState declarations |
| `main.py` | 3,668 lines | Monolithic backend with mixed concerns |
| `usePortfolioData.jsx` | 595 lines | Does everything - CRUD, email, import/export |
| `agent/` + `agent-sdk/` | Dual systems | Incomplete migration, maintenance burden |

### Architecture Smell Summary

- **No separation of concerns** - UI logic, business logic, state management all mixed
- **Prop drilling** - Data passed through 3-4 component layers
- **Duplicate logic** - Person resolution exists in both frontend and backend
- **Incomplete migration** - Legacy agent code coexists with new OpenAI Agents SDK
- **No global state** - 140+ useState in single component
- **Testing gaps** - <10% coverage estimated

---

## Phase 1: Frontend Decomposition

### 1.1 Extract View Components from ManityApp.jsx

**Goal:** Reduce ManityApp.jsx from 10,724 lines to <1,500 lines

Create dedicated view containers:

```
src/views/
├── PeopleView.jsx        # PeopleGraph + selection state + controls
├── TimelineView.jsx      # ForceDirectedTimeline + filters
├── MomentumView.jsx      # MomentumChatWithAgent + conversation state
├── SlidesView.jsx        # Slides component + export controls
├── DataView.jsx          # DataPage admin interface
└── CheckinView.jsx       # Daily checkin modal (if still used)
```

**ManityApp.jsx becomes:**
- Router/orchestrator for views
- Top-level layout (sidebar, header)
- View switching logic
- Minimal shared state

### 1.2 Split usePortfolioData into Domain Hooks

**Current:** Single hook handles all API operations

**Target:**
```
src/hooks/
├── useProjects.js        # Project CRUD, task operations
├── usePeople.js          # Person CRUD, deduplication
├── useActivities.js      # Activity/comment management
├── useEmailSettings.js   # Email config (move to backend?)
├── useDataExport.js      # Import/export operations
└── usePortfolioData.js   # Orchestrator (if needed), re-exports
```

### 1.3 Implement Lightweight State Management

**Problem:** 140+ useState in ManityApp, prop drilling everywhere

**Solution:** Add Zustand for shared state

```
src/store/
├── index.js              # Store setup
├── projectStore.js       # Selected project, filters, sort
├── uiStore.js            # Active view, modals, sidebar state
└── agentStore.js         # Agent conversation state, pending actions
```

**Benefits:**
- Remove prop drilling
- Clear data flow
- Easy to test
- Minimal boilerplate (unlike Redux)

### 1.4 Decompose Large Components

| Component | Current | Target Sub-components |
|-----------|---------|----------------------|
| `PeopleGraph.jsx` (2,174 lines) | Monolithic | `GraphCanvas`, `GraphControls`, `PersonNode`, `ConnectionEdge`, `useGraphLayout` |
| `MomentumChatWithAgent.jsx` (1,137 lines) | Monolithic | `ChatMessageList`, `ChatInput`, `ThinkingIndicator`, `ActionPreview`, `UndoControls` |
| `Slides.jsx` (998 lines) | Monolithic | `SlideRenderer`, `SlideControls`, `ExportDialog`, `useSlideGeneration` |
| `DataPage.jsx` (997 lines) | Monolithic | `DataTable`, `EntityEditor`, `RelationshipViewer`, `FilterControls` |

---

## Phase 2: Backend Modularization

### 2.1 Split main.py into Modules

**Current:** 3,668 lines in single file

**Target Structure:**
```
backend/
├── main.py                 # FastAPI app, CORS, startup only (~100 lines)
├── config.py               # Settings, database paths, environment
├── database.py             # Engine setup, session management
├── models/
│   ├── __init__.py
│   ├── person.py           # Person SQLModel
│   ├── project.py          # Project, Task, Subtask SQLModels
│   ├── activity.py         # Activity SQLModel
│   └── settings.py         # EmailSettings, AuditLog, MigrationState
├── schemas/
│   ├── __init__.py
│   ├── person.py           # PersonPayload, PersonResponse
│   ├── project.py          # ProjectPayload, TaskPayload, etc.
│   └── common.py           # Shared schemas
├── routers/
│   ├── __init__.py
│   ├── people.py           # /people endpoints
│   ├── projects.py         # /projects endpoints
│   ├── tasks.py            # Task/subtask endpoints
│   ├── activities.py       # Activity/comment endpoints
│   ├── email.py            # /settings/email, /actions/email
│   ├── llm.py              # /api/llm/chat proxy
│   └── export.py           # /export, /import endpoints
├── services/
│   ├── __init__.py
│   ├── person_service.py   # Person resolution, deduplication
│   ├── project_service.py  # Project business logic
│   └── email_service.py    # SMTP operations
└── utils/
    ├── __init__.py
    ├── serialization.py    # serialize_project, serialize_task, etc.
    └── security.py         # Admin key validation
```

### 2.2 Consolidate Person Resolution Logic

**Problem:** Duplicate person resolution in frontend (`usePortfolioData`) and backend (`PersonIndex`)

**Solution:** Single source of truth in backend

- Remove `dedupePeople`, `findPersonByName`, `personRefForApi` from frontend
- Enhance backend `person_service.py` to handle all resolution
- Frontend sends person names/emails, backend resolves to IDs
- Return canonical person data in all responses

### 2.3 Remove Hardcoded Configuration

**Current:**
```python
DEFAULT_DEV_DB_PATH = "/home/c17420g/projects/manity-dev-data/portfolio.db"
DEFAULT_PROD_DB_PATH = "/home/c17420g/projects/manity-data/portfolio.db"
```

**Target:** Environment-driven configuration
```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///./portfolio.db"
    openai_api_key: str = ""
    admin_key: str = ""
    # ... other settings

    class Config:
        env_file = ".env"
```

---

## Phase 3: Complete Agent Migration & Remove Legacy Code

### 3.1 Current Agent State

```
src/agent/           # LEGACY - Still provides types and UndoManager
├── types.ts         # Delta, Project, Task, Person interfaces
├── UndoManager.ts   # Reversible state tracking
└── context/         # Legacy context (deprecated)

src/agent-sdk/       # NEW - OpenAI Agents SDK integration
├── useAgentRuntime.ts
├── agent.ts
├── tools/           # 12 domain tools
└── ...
```

### 3.2 Migration Completion Tasks

1. **Move types to shared location**
   ```
   src/types/
   ├── portfolio.ts    # Portfolio data types (from agent/types.ts)
   ├── agent.ts        # Agent-specific types
   └── api.ts          # API request/response types
   ```

2. **Preserve UndoManager**
   - Move to `src/lib/UndoManager.ts` (it's a valid feature, not legacy)
   - Update imports in agent-sdk

3. **Remove legacy agent code**
   - Delete `src/agent/context/`
   - Delete empty/unused files in `src/agent/`
   - Keep only migrated utilities

4. **Verify agent-sdk completeness**
   - All 12 tools working
   - useAgentRuntime fully integrated
   - Remove MIGRATION_PLAN_OPENAI_AGENTS_SDK.md after completion

---

## Phase 4: Remove Vestigial Code

### 4.1 Seasonal Theme Code (Christmas)

**Files to evaluate:**
- `SnowEffect.jsx` - Snow animation
- `ChristmasConfetti.jsx` - Holiday confetti

**Decision:** Remove or make configurable
- If keeping: Add `VITE_ENABLE_SEASONAL_THEMES` flag
- If removing: Delete components and references

### 4.2 Unused Demo/Seed Data

**File:** `backend/seed_demo_data.py`

**Decision:** Keep for development, but:
- Add clear documentation
- Ensure not accidentally run in production
- Consider moving to `scripts/` directory

### 4.3 Email Settings Dual Storage

**Problem:** Email settings stored in both:
- `localStorage` (browser)
- Backend `EmailSettings` table

**Solution:** Single source of truth
- Store only in backend
- Frontend fetches settings via API
- Remove localStorage email config

### 4.4 Audit for Unused Exports/Functions

Run dead code analysis:
```bash
# Find unused exports
npx ts-prune src/

# Find unused functions in Python
vulture backend/
```

---

## Phase 5: Type Safety & Testing

### 5.1 Enforce TypeScript

**Current:** Mix of `.jsx` and `.ts/.tsx`

**Target:** Full TypeScript
- Rename `.jsx` → `.tsx`
- Add strict tsconfig
- Define types for all API responses
- Use Zod for runtime validation (already in place for agent tools)

### 5.2 Add Test Coverage

**Frontend Tests:**
```
src/
├── __tests__/
│   ├── hooks/
│   │   ├── useProjects.test.ts
│   │   └── usePeople.test.ts
│   ├── components/
│   │   ├── ChatMessageList.test.tsx
│   │   └── DataTable.test.tsx
│   └── views/
│       └── PeopleView.test.tsx
```

**Backend Tests:**
```
backend/
├── tests/
│   ├── test_people.py
│   ├── test_projects.py
│   ├── test_person_service.py
│   └── test_api_integration.py
```

**Coverage Target:** 60%+ for critical paths

---

## Implementation Order

### Recommended Sequence

```
Phase 1.1 (Extract Views)           ████████░░  HIGH IMPACT
    ↓
Phase 1.2 (Split Hooks)             ███████░░░  HIGH IMPACT
    ↓
Phase 2.1 (Backend Modules)         ███████░░░  HIGH IMPACT
    ↓
Phase 1.3 (State Management)        █████░░░░░  MEDIUM IMPACT
    ↓
Phase 3 (Agent Migration)           ████░░░░░░  MEDIUM IMPACT
    ↓
Phase 1.4 (Decompose Components)    ████░░░░░░  MEDIUM IMPACT
    ↓
Phase 2.2-2.3 (Backend Cleanup)     ███░░░░░░░  LOW IMPACT
    ↓
Phase 4 (Remove Vestigial)          ██░░░░░░░░  LOW IMPACT
    ↓
Phase 5 (Types & Tests)             █████░░░░░  ONGOING
```

### Dependencies

- Phase 1.2 depends on 1.1 (hooks need view context)
- Phase 1.3 can run parallel to 1.2
- Phase 2.1 is independent (can start immediately)
- Phase 3 requires 1.1-1.2 to settle
- Phase 4-5 can happen throughout

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking changes during refactor | HIGH | HIGH | Incremental changes, maintain tests |
| Agent functionality regression | MEDIUM | HIGH | Test agent flows before removing legacy |
| State management migration bugs | MEDIUM | MEDIUM | Run both systems briefly, verify |
| Backend API changes break frontend | MEDIUM | MEDIUM | Version API, update frontend first |

---

## Success Metrics

After refactoring:

- [ ] `ManityApp.jsx` < 1,500 lines
- [ ] `main.py` < 200 lines (router/startup only)
- [ ] No file > 800 lines
- [ ] Zero duplicate person resolution logic
- [ ] Legacy `agent/` directory removed
- [ ] Test coverage > 60% on critical paths
- [ ] Full TypeScript (no `.jsx` files)
- [ ] Clear separation: views / hooks / components / store

---

## Files to Delete (Vestigial)

Pending investigation, likely candidates:
- `src/agent/context/` - Legacy agent context
- Parts of `src/agent/` after migration
- Seasonal theme components (if not wanted)
- Any unused utility functions identified by dead code analysis

---

## Questions for Product Decision

1. **Seasonal themes** - Keep SnowEffect/ChristmasConfetti? Make configurable?
2. **Email settings** - Backend-only or keep browser storage option?
3. **Demo data** - Keep seed_demo_data.py for onboarding?
4. **Daily checkin** - Is CheckinView still used/wanted?

---

## Next Steps

1. Review and approve this plan
2. Create feature branch for Phase 1.1
3. Begin extracting views from ManityApp.jsx
4. Set up parallel work on Phase 2.1 (backend modules)
