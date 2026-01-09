# Initiatives Feature Implementation Plan

## Overview

**Goal:** Create a concept of "Initiatives" - meta-projects that group multiple related projects together. Projects in the project view will be grouped by initiative using simple labeled containers.

---

## Current State

### Existing Data Model
- Projects are standalone entities with no parent-child relationships
- No grouping/categorization field exists in the Project model
- Projects have: tasks, subtasks, activities, stakeholders
- Many-to-many relationships already exist (e.g., Project ↔ Person via `ProjectPersonLink`)

### Key Files
- Backend model: `/backend/models/project.py`
- Backend routes: `/backend/routers/projects.py`
- Frontend types: `/src/types/portfolio.ts`
- Frontend hook: `/src/hooks/useProjects.js`
- Store: `/src/store/projectStore.js`
- Main views: `/src/views/MomentumView.jsx`, `/src/components/chat/MomentumProjectCard.jsx`

---

## Implementation Plan

### Phase 1: Backend Data Model

#### 1.1 Create Initiative Model

**File:** `/backend/models/initiative.py`

```python
# New model structure (conceptual)
class Initiative:
    id: str                           # Primary key
    name: str                         # Unique, indexed
    description: str                  # Initiative description
    status: str                       # planning | active | on-hold | cancelled | completed
    priority: str                     # high | medium | low
    startDate: Optional[str]          # ISO format date
    targetDate: Optional[str]         # ISO format date
    createdAt: str                    # Timestamp
    updatedAt: str                    # Timestamp

    # Relationships
    projects: list[Project]           # One-to-many
```

#### 1.2 Update Project Model

**File:** `/backend/models/project.py`

Add optional foreign key to link projects to initiatives:
- Add `initiative_id: Optional[str]` field
- Add `initiative: Optional[Initiative]` relationship
- Projects can exist without an initiative (ungrouped)

#### 1.3 Update Model Exports

**File:** `/backend/models/__init__.py`

Export the new Initiative model.

---

### Phase 2: Backend API Routes

#### 2.1 Create Initiatives Router

**File:** `/backend/routers/initiatives.py`

**Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/initiatives` | List all initiatives with their projects |
| POST | `/initiatives` | Create new initiative |
| GET | `/initiatives/{id}` | Get single initiative with projects |
| PUT | `/initiatives/{id}` | Update initiative |
| DELETE | `/initiatives/{id}` | Delete initiative (projects become ungrouped) |
| POST | `/initiatives/{id}/projects/{project_id}` | Add project to initiative |
| DELETE | `/initiatives/{id}/projects/{project_id}` | Remove project from initiative |

#### 2.2 Update Projects Router

**File:** `/backend/routers/projects.py`

- Include `initiative_id` in project responses
- Allow setting `initiative_id` when creating/updating projects
- Add filter option: `GET /projects?initiative_id=xxx` or `?ungrouped=true`

#### 2.3 Register Routes

**File:** `/backend/main.py`

Add initiatives router to the FastAPI app.

---

### Phase 3: Frontend Types & State

#### 3.1 Add Initiative Type

**File:** `/src/types/portfolio.ts`

```typescript
// New type
export interface Initiative {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on-hold' | 'cancelled' | 'completed';
  priority: 'high' | 'medium' | 'low';
  startDate?: string;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
  projects: Project[];  // Populated when fetching initiatives
}

// Update existing Project interface
export interface Project {
  // ... existing fields ...
  initiativeId?: string;  // Add optional initiative reference
}
```

#### 3.2 Create Initiatives Hook

**File:** `/src/hooks/useInitiatives.js`

Provide operations:
- `refreshInitiatives()` - Fetch all initiatives
- `createInitiative(initiative)` - Create new
- `updateInitiative(id, updates)` - Update
- `deleteInitiative(id)` - Delete
- `addProjectToInitiative(initiativeId, projectId)` - Link project
- `removeProjectFromInitiative(initiativeId, projectId)` - Unlink project

#### 3.3 Update Project Store

**File:** `/src/store/projectStore.js`

Add initiative-related state:
- `selectedInitiative` - Currently selected initiative
- `expandedInitiatives` - Set of expanded initiative IDs in list view
- Form states for initiative creation

---

### Phase 4: Frontend UI Components

#### 4.1 Initiative Container Component

**File:** `/src/components/InitiativeContainer.jsx`

A collapsible container that:
- Shows initiative name as a header/label
- Contains child project cards
- Has expand/collapse functionality
- Shows initiative status indicator
- Optionally shows aggregate progress across projects

```
┌─────────────────────────────────────────┐
│ ▼ Initiative Name          [Status]     │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐       │
│  │ Project 1   │  │ Project 2   │       │
│  └─────────────┘  └─────────────┘       │
│  ┌─────────────┐                        │
│  │ Project 3   │                        │
│  └─────────────┘                        │
└─────────────────────────────────────────┘
```

#### 4.2 Ungrouped Projects Section

Display projects without an initiative in a separate "Ungrouped" or "Standalone Projects" section at the bottom of the view.

#### 4.3 Update MomentumView

**File:** `/src/views/MomentumView.jsx`

Modify to:
- Fetch initiatives alongside projects
- Group projects by initiative
- Render `InitiativeContainer` for each initiative
- Render ungrouped projects separately

#### 4.4 Initiative Management UI (Optional for MVP)

- Initiative creation modal/form
- Drag-and-drop projects between initiatives
- Initiative detail/edit view

---

### Phase 5: Agent Integration

#### 5.1 Create Initiative Tool

**File:** `/src/agent-sdk/tools/createInitiative.ts`

Allow agent to create initiatives with name, description, priority, status.

#### 5.2 Update Project Tool

**File:** `/src/agent-sdk/tools/updateProject.ts`

Allow setting `initiativeId` to assign projects to initiatives.

#### 5.3 Add Project to Initiative Tool

**File:** `/src/agent-sdk/tools/addProjectToInitiative.ts`

Dedicated tool to link existing projects to initiatives.

---

## Data Migration

For existing deployments with projects:
- All existing projects will have `initiative_id = null` (ungrouped)
- No breaking changes to existing functionality
- Projects can be organized into initiatives incrementally

---

## UI/UX Considerations

### Grouping Display
- Initiatives are collapsible containers
- Visual hierarchy: Initiative header → Project cards inside
- Ungrouped projects shown in a separate section
- Consider color-coding or icons to distinguish initiatives

### Interaction Patterns
- Click initiative header to expand/collapse
- Click project card to navigate to project (existing behavior)
- Drag-drop to reorganize (future enhancement)
- Context menu to remove from initiative

### Progress Aggregation (Optional)
- Initiative could show aggregate progress bar
- Calculate from average/weighted progress of child projects
- Show count: "3 of 5 projects completed"

---

## Implementation Order (Recommended)

1. **Backend Model** - Create Initiative model, update Project model
2. **Backend API** - Create initiatives router, update projects router
3. **Frontend Types** - Add Initiative interface, update Project interface
4. **Frontend Hook** - Create useInitiatives.js
5. **UI Container** - Build InitiativeContainer component
6. **Update Views** - Integrate grouping into MomentumView
7. **Agent Tools** - Add initiative-related tools
8. **Polish** - Styling, edge cases, empty states

---

## Open Questions / Decisions Needed

1. **Should initiatives have their own stakeholders?** Or only aggregate from projects?
2. **Should initiatives have their own activities/timeline?** Or show aggregated project activities?
3. **Can a project belong to multiple initiatives?** (Current plan assumes one-to-many: one initiative, many projects)
4. **What happens when an initiative is deleted?** (Current plan: projects become ungrouped)
5. **Should there be a separate "Initiatives" view?** Or just grouping in existing views?

---

## File Summary

### New Files
- `/backend/models/initiative.py`
- `/backend/routers/initiatives.py`
- `/src/hooks/useInitiatives.js`
- `/src/components/InitiativeContainer.jsx`
- `/src/agent-sdk/tools/createInitiative.ts`
- `/src/agent-sdk/tools/addProjectToInitiative.ts`

### Modified Files
- `/backend/models/project.py` - Add initiative_id field
- `/backend/models/__init__.py` - Export Initiative
- `/backend/main.py` - Register initiatives router
- `/backend/routers/projects.py` - Include initiative in responses
- `/src/types/portfolio.ts` - Add Initiative type, update Project
- `/src/hooks/useProjects.js` - Support initiative_id
- `/src/store/projectStore.js` - Add initiative state
- `/src/views/MomentumView.jsx` - Group by initiative
- `/src/agent-sdk/tools/updateProject.ts` - Support initiative assignment
