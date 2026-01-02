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

## Product Decisions (Resolved)

| Question | Decision |
|----------|----------|
| Seasonal themes | **KEEP** - Convert to modular system with auto-switching by date |
| Email settings | **KEEP AS-IS** - Dual storage (localStorage + backend) |
| Daily check-in | **KEEP** - Feature will be improved in future |
| Demo data | Keep for development |

---

## Phase 4: Seasonal Themes Module

### 4.1 Overview

Convert the hardcoded Christmas theme into a modular seasonal themes system that:
- Auto-switches based on system date
- Supports multiple holidays (Christmas, Easter, Halloween, etc.)
- Provides both visual effects (confetti/particles) and color schemes
- Is easily extensible for future holidays

### 4.2 Architecture

```
src/themes/
├── index.ts                    # Main exports, getActiveTheme()
├── types.ts                    # SeasonalTheme interface
├── seasonManager.ts            # Date-based theme selection
├── colors/
│   ├── index.ts                # Color palette exports
│   ├── base.ts                 # Default/neutral palette
│   ├── christmas.ts            # Christmas reds/greens/golds
│   ├── easter.ts               # Easter pastels
│   ├── halloween.ts            # Halloween oranges/purples
│   ├── valentines.ts           # Valentine pinks/reds
│   └── stPatricks.ts           # St. Patrick's greens
├── effects/
│   ├── index.ts                # Effect component exports
│   ├── ParticleCanvas.tsx      # Shared canvas component
│   ├── SnowEffect.tsx          # Winter snow (refactored)
│   ├── EasterConfetti.tsx      # Easter eggs/bunnies
│   ├── HalloweenEffect.tsx     # Bats/pumpkins/ghosts
│   ├── HeartsEffect.tsx        # Valentine hearts
│   └── ShamrockEffect.tsx      # St. Patrick's clovers
└── hooks/
    ├── useSeasonalTheme.ts     # React hook for current theme
    └── useSeasonalEffect.ts    # React hook for current effect
```

### 4.3 Theme Definition Interface

```typescript
// src/themes/types.ts

interface SeasonalTheme {
  id: string;
  name: string;

  // Date range for auto-activation (month/day)
  startDate: { month: number; day: number };
  endDate: { month: number; day: number };

  // Color palette (maps to existing color names)
  colors: {
    earth: string;
    sage: string;
    coral: string;
    amber: string;
    cream: string;
    cloud: string;
    stone: string;
    charcoal: string;
  };

  // Visual effect configuration
  effect: {
    component: React.ComponentType;
    emojis?: string[];           // For confetti-style effects
    particleColor?: string;      // For particle effects (snow)
    particleCount?: number;
  };
}
```

### 4.4 Season Schedule

| Theme | Start Date | End Date | Effect | Emojis |
|-------|------------|----------|--------|--------|
| Christmas | Dec 1 | Dec 31 | Snow + Confetti | 🎄🎅🎁⛄🦌🔔⭐🍬🕯️❄️ |
| Valentine's | Feb 7 | Feb 14 | Hearts | 💕❤️💖💘💝🌹 |
| St. Patrick's | Mar 14 | Mar 17 | Shamrocks | ☘️🍀🌈🪙💚 |
| Easter | *Dynamic* | *Dynamic* | Confetti | 🐰🥚🐣🌷🌸🦋🐥 |
| Halloween | Oct 24 | Oct 31 | Bats/Pumpkins | 🎃👻🦇🕷️🕸️🍬💀🌙 |
| Base | *Default* | *Default* | None | - |

*Easter uses lunar calendar calculation for dynamic dates*

### 4.5 Season Manager Logic

```typescript
// src/themes/seasonManager.ts

import { christmasTheme } from './colors/christmas';
import { easterTheme } from './colors/easter';
import { halloweenTheme } from './colors/halloween';
import { valentinesTheme } from './colors/valentines';
import { stPatricksTheme } from './colors/stPatricks';
import { baseTheme } from './colors/base';

const themes: SeasonalTheme[] = [
  christmasTheme,
  valentinesTheme,
  stPatricksTheme,
  easterTheme,      // Uses getEasterDate() for dynamic range
  halloweenTheme,
];

export function getActiveTheme(date: Date = new Date()): SeasonalTheme {
  const month = date.getMonth() + 1;  // 1-12
  const day = date.getDate();

  for (const theme of themes) {
    if (isDateInRange(month, day, theme.startDate, theme.endDate)) {
      return theme;
    }
  }

  return baseTheme;
}

// Easter calculation (Computus algorithm)
export function getEasterDate(year: number): Date {
  // ... Computus algorithm implementation
}
```

### 4.6 Usage in Application

```tsx
// In ManityApp.jsx (or future AppShell component)

import { useSeasonalTheme, useSeasonalEffect } from './themes/hooks';

function AppShell({ children }) {
  const theme = useSeasonalTheme();
  const EffectComponent = useSeasonalEffect();

  return (
    <ThemeProvider value={theme.colors}>
      {children}
      {EffectComponent && <EffectComponent />}
    </ThemeProvider>
  );
}
```

### 4.7 Theme Color Definitions

**Easter Theme:**
```typescript
export const easterTheme: SeasonalTheme = {
  id: 'easter',
  name: 'Easter',
  colors: {
    earth: '#E8B4D8',      // Soft pink
    sage: '#98D8AA',       // Mint green
    coral: '#FFB4B4',      // Blush
    amber: '#FFEAA7',      // Pale yellow
    cream: '#FFF8F0',      // Warm white
    cloud: '#F0E6F6',      // Lavender tint
    stone: '#B4A7D6',      // Soft purple
    charcoal: '#4A4063',   // Deep purple
  },
  effect: {
    component: EasterConfetti,
    emojis: ['🐰', '🥚', '🐣', '🌷', '🌸', '🦋', '🐥', '🌼'],
  },
};
```

**Halloween Theme:**
```typescript
export const halloweenTheme: SeasonalTheme = {
  id: 'halloween',
  name: 'Halloween',
  colors: {
    earth: '#FF6600',      // Pumpkin orange
    sage: '#4A0080',       // Deep purple
    coral: '#FF4444',      // Blood red
    amber: '#FFD700',      // Candy gold
    cream: '#1A1A2E',      // Dark background
    cloud: '#2D2D44',      // Dark cloud
    stone: '#8B4513',      // Brown
    charcoal: '#0D0D1A',   // Near black
  },
  effect: {
    component: HalloweenEffect,
    emojis: ['🎃', '👻', '🦇', '🕷️', '🕸️', '🍬', '💀', '🌙'],
  },
};
```

### 4.8 Migration Steps

1. Create `src/themes/` directory structure
2. Extract and refactor `SnowEffect.jsx` → `effects/SnowEffect.tsx`
3. Extract and refactor `ChristmasConfetti.jsx` → `effects/ChristmasConfetti.tsx`
4. Create shared `ParticleCanvas.tsx` for common canvas logic
5. Migrate `lib/theme.js` → `themes/colors/base.ts` + `themes/colors/christmas.ts`
6. Implement `seasonManager.ts` with date logic
7. Create hooks: `useSeasonalTheme`, `useSeasonalEffect`
8. Build out additional themes (Easter, Halloween, Valentine's, St. Patrick's)
9. Update `ManityApp.jsx` to use new theme system
10. Delete old files: `lib/theme.js`, `components/SnowEffect.jsx`, `components/ChristmasConfetti.jsx`

---

## Phase 5: Clean Up Vestigial Code

### 5.1 Demo/Seed Data

**File:** `backend/seed_demo_data.py`

**Decision:** Keep for development, but:
- Add clear documentation
- Ensure not accidentally run in production
- Consider moving to `scripts/` directory

### 5.2 Audit for Unused Exports/Functions

Run dead code analysis:
```bash
# Find unused exports
npx ts-prune src/

# Find unused functions in Python
vulture backend/
```

### 5.3 Legacy Agent Cleanup

After Phase 3 (Agent Migration) is complete:
- Remove `src/agent/context/` entirely
- Keep only `UndoManager.ts` (moved to `src/lib/`)
- Keep only type definitions (moved to `src/types/`)

---

## Phase 6: Type Safety & Testing

### 6.1 Enforce TypeScript

**Current:** Mix of `.jsx` and `.ts/.tsx`

**Target:** Full TypeScript
- Rename `.jsx` → `.tsx`
- Add strict tsconfig
- Define types for all API responses
- Use Zod for runtime validation (already in place for agent tools)

### 6.2 Add Test Coverage

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
Phase 4 (Seasonal Themes Module)    ████░░░░░░  MEDIUM IMPACT
    ↓
Phase 5 (Clean Up Vestigial)        ██░░░░░░░░  LOW IMPACT
    ↓
Phase 6 (Types & Tests)             █████░░░░░  ONGOING
```

### Dependencies

- Phase 1.2 depends on 1.1 (hooks need view context)
- Phase 1.3 can run parallel to 1.2
- Phase 2.1 is independent (can start immediately)
- Phase 3 requires 1.1-1.2 to settle
- Phase 4 (Seasonal Themes) can run in parallel with other phases
- Phase 5-6 can happen throughout

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

- [ ] `ManityApp.jsx` < 1,500 lines (IN PROGRESS - views extracted, needs integration)
- [ ] `main.py` < 200 lines (IN PROGRESS - routers created, needs integration)
- [ ] No file > 800 lines
- [ ] Zero duplicate person resolution logic
- [x] Legacy `agent/` directory cleaned up (UndoManager + types moved to new locations)
- [x] Modular seasonal themes system with 5+ themes (6 themes: base, christmas, easter, halloween, valentine, st.patrick)
- [ ] Test coverage > 60% on critical paths
- [ ] Full TypeScript (no `.jsx` files)
- [x] Clear separation: views / hooks / components / store / themes

---

## Files Migrated

| File/Directory | Status | New Location |
|----------------|--------|--------------|
| `src/agent/context/` | ✅ DELETED | Logic moved to `src/lib/agentHelpers.ts` |
| `src/agent/types.ts` | ✅ MIGRATED | `src/types/portfolio.ts` (re-exported for compat) |
| `src/agent/UndoManager.ts` | ✅ MIGRATED | `src/lib/UndoManager.ts` (re-exported for compat) |
| `src/lib/theme.js` | ✅ UPDATED | Now re-exports from `src/themes/colors/` |
| `src/components/SnowEffect.jsx` | ✅ UPDATED | Now re-exports from `src/themes/effects/` |
| `src/components/ChristmasConfetti.jsx` | ✅ UPDATED | Now re-exports from `src/themes/effects/` |

---

## Implementation Status

### Completed
- ✅ Phase 1.1: View components created (PeopleView, TimelineView, MomentumView, SlidesView, DataView)
- ✅ Phase 1.3: Zustand stores created (uiStore, projectStore, momentumStore)
- ✅ Phase 2.1: Backend modules created (models/, routers/, config.py)
- ✅ Phase 2.3: Environment-driven configuration
- ✅ Phase 3: Agent migration complete (types and UndoManager moved)
- ✅ Phase 4: Seasonal themes module with 6 themes and 3 effects
- ✅ Phase 5: Legacy code updated with backward-compatible re-exports

### Remaining Work
- Phase 1.2: Split usePortfolioData into domain hooks
- Phase 1.4: Decompose large components (PeopleGraph, MomentumChat, etc.)
- Phase 2.2: Consolidate person resolution logic
- Phase 6: Type safety & testing
- Integration: Update ManityApp.jsx to use new views and stores
