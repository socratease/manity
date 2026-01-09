# Initiatives Feature Implementation Plan

## Overview

**Goal:** Create a concept of "Initiatives" - meta-projects that group multiple related projects together. Projects in the project view will be grouped by initiative using simple labeled containers.

---

## Design Decisions (Confirmed)

1. **Owners vs Stakeholders:**
   - Initiatives have their own **owners** (people directly connected to the initiative)
   - Initiatives also surface **stakeholders** (aggregated from all related projects)
   - The agentic system can distinguish between emailing "owners", "stakeholders", or "contributors"

2. **Project-Initiative Relationship:**
   - A project can only belong to **one initiative** (one-to-many)
   - Projects can exist without an initiative (ungrouped)

3. **Deletion Behavior:**
   - When an initiative is deleted, its projects become **ungrouped** (not deleted)

---

## Current State

### Existing Data Model
- Projects are standalone entities with no parent-child relationships
- No grouping/categorization field exists in the Project model
- Projects have: tasks, subtasks, activities, stakeholders
- Many-to-many relationships already exist (e.g., Project ↔ Person via `ProjectPersonLink`)

### Key Files
- Backend main: `/backend/main.py` (routes defined directly on app)
- Backend models: `/backend/models/project.py`, `/backend/models/person.py`
- Frontend types: `/src/types/portfolio.ts`
- Frontend hook: `/src/hooks/useProjects.js`
- Store: `/src/store/projectStore.js`
- Main views: `/src/views/MomentumView.jsx`, `/src/components/chat/MomentumProjectCard.jsx`
- Agent tools: `/src/agent-sdk/tools/`

---

## Implementation Plan

### Phase 1: Backend Data Model

#### 1.1 Create Initiative Model

**File:** `/backend/models/initiative.py`

```python
class InitiativePersonLink(SQLModel, table=True):
    """Link table for many-to-many relationship between Initiatives and People (owners)."""
    initiative_id: str = Field(foreign_key="initiative.id", primary_key=True)
    person_id: str = Field(foreign_key="person.id", primary_key=True)

class InitiativeBase(SQLModel):
    """Base model for Initiative with common fields."""
    name: str = Field(sa_column=Column(String, unique=True, index=True))
    description: str = ""
    status: str = "planning"  # planning | active | on-hold | cancelled | completed
    priority: str = "medium"  # high | medium | low
    startDate: Optional[str] = None
    targetDate: Optional[str] = None

class Initiative(InitiativeBase, table=True):
    """Initiative entity - a meta-project that groups related projects."""
    id: Optional[str] = Field(default=None, primary_key=True)

    # Relationships
    projects: list["Project"] = Relationship(back_populates="initiative")
    owners: list["Person"] = Relationship(
        back_populates="owned_initiatives",
        link_model=InitiativePersonLink,
    )

    # Computed property for aggregated stakeholders from all projects
    @property
    def stakeholders(self) -> list["Person"]:
        """Aggregate all unique stakeholders from child projects."""
        seen = set()
        result = []
        for project in self.projects:
            for stakeholder in project.stakeholders:
                if stakeholder.id not in seen:
                    seen.add(stakeholder.id)
                    result.append(stakeholder)
        return result
```

#### 1.2 Update Project Model

**File:** `/backend/models/project.py`

Add optional foreign key to link projects to initiatives:
```python
class Project(ProjectBase, table=True):
    # ... existing fields ...
    initiative_id: Optional[str] = Field(
        default=None,
        sa_column=Column("initiative_id", String, ForeignKey("initiative.id", ondelete="SET NULL"), nullable=True),
    )
    initiative: Optional["Initiative"] = Relationship(back_populates="projects")
```

#### 1.3 Update Person Model

**File:** `/backend/models/person.py`

Add relationship for initiative ownership:
```python
class Person(PersonBase, table=True):
    # ... existing fields ...
    owned_initiatives: list["Initiative"] = Relationship(
        back_populates="owners",
        link_model="InitiativePersonLink",
    )
```

#### 1.4 Update Model Exports

**File:** `/backend/models/__init__.py`

Export the new Initiative model and InitiativePersonLink.

---

### Phase 2: Backend API Routes

#### 2.1 Add Initiatives to main.py

**File:** `/backend/main.py`

**Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/initiatives` | List all initiatives with projects and owners |
| POST | `/initiatives` | Create new initiative |
| GET | `/initiatives/{id}` | Get single initiative with projects, owners, stakeholders |
| PUT | `/initiatives/{id}` | Update initiative |
| DELETE | `/initiatives/{id}` | Delete initiative (projects become ungrouped) |
| POST | `/initiatives/{id}/owners/{person_id}` | Add owner to initiative |
| DELETE | `/initiatives/{id}/owners/{person_id}` | Remove owner from initiative |
| POST | `/initiatives/{id}/projects/{project_id}` | Add project to initiative |
| DELETE | `/initiatives/{id}/projects/{project_id}` | Remove project from initiative |

**Response Format:**
```json
{
  "id": "initiative-123",
  "name": "Q1 Product Launch",
  "description": "All projects related to Q1 launch",
  "status": "active",
  "priority": "high",
  "startDate": "2024-01-01",
  "targetDate": "2024-03-31",
  "owners": [
    { "id": "person-1", "name": "Alice", "team": "Product", "email": "alice@example.com" }
  ],
  "stakeholders": [
    { "id": "person-2", "name": "Bob", "team": "Engineering", "email": "bob@example.com" }
  ],
  "projects": [
    { "id": "project-1", "name": "Feature X", "status": "active", "progress": 50 }
  ]
}
```

#### 2.2 Update Projects Endpoints

- Include `initiativeId` and `initiative` (name only) in project responses
- Allow setting `initiativeId` when creating/updating projects

---

### Phase 3: Frontend Types & State

#### 3.1 Add Initiative Type

**File:** `/src/types/portfolio.ts`

```typescript
export interface Initiative {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on-hold' | 'cancelled' | 'completed';
  priority: 'high' | 'medium' | 'low';
  startDate?: string;
  targetDate?: string;
  owners: Person[];           // Direct owners of the initiative
  stakeholders: Person[];     // Aggregated from all projects
  projects: Project[];        // Child projects
}

// Update existing Project interface
export interface Project {
  // ... existing fields ...
  initiativeId?: string;
  initiative?: { id: string; name: string };
}
```

#### 3.2 Create Initiatives Hook

**File:** `/src/hooks/useInitiatives.js`

Provide operations:
- `refreshInitiatives()` - Fetch all initiatives
- `createInitiative(initiative)` - Create new
- `updateInitiative(id, updates)` - Update
- `deleteInitiative(id)` - Delete
- `addOwnerToInitiative(initiativeId, personId)` - Add owner
- `removeOwnerFromInitiative(initiativeId, personId)` - Remove owner
- `addProjectToInitiative(initiativeId, projectId)` - Link project
- `removeProjectFromInitiative(initiativeId, projectId)` - Unlink project

#### 3.3 Update Project Store

**File:** `/src/store/projectStore.js`

Add initiative-related state:
- `initiatives` - List of all initiatives
- `selectedInitiative` - Currently selected initiative
- `expandedInitiatives` - Set of expanded initiative IDs in list view

---

### Phase 4: Frontend UI Components

#### 4.1 Initiative Container Component

**File:** `/src/components/InitiativeContainer.jsx`

A collapsible container that:
- Shows initiative name as a header/label
- Contains child project cards
- Has expand/collapse functionality
- Shows initiative status indicator and owner avatars
- Optionally shows aggregate progress across projects

```
┌─────────────────────────────────────────────────────┐
│ ▼ Q1 Product Launch    [Active]    👤 Alice, Bob   │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Project 1   │  │ Project 2   │  │ Project 3   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### 4.2 Ungrouped Projects Section

Display projects without an initiative in a separate "Ungrouped Projects" section at the bottom of the view.

#### 4.3 Update MomentumView

**File:** `/src/views/MomentumView.jsx`

Modify to:
- Fetch initiatives alongside projects
- Group projects by initiative
- Render `InitiativeContainer` for each initiative
- Render ungrouped projects separately

---

### Phase 5: Agent Integration

#### 5.1 Update queryPortfolio Tool

**File:** `/src/agent-sdk/tools/queryPortfolio.ts`

Add initiative scope and ability to query owners vs stakeholders:
```typescript
scope: z.enum(['portfolio', 'project', 'people', 'initiative', 'initiatives'])
initiativeId: z.string().optional()
initiativeName: z.string().optional()
```

Response includes:
- `owners` - People who own the initiative
- `stakeholders` - Aggregated from all projects in initiative
- `contributors` - People assigned to tasks in initiative projects

#### 5.2 Create Initiative Tool

**File:** `/src/agent-sdk/tools/createInitiative.ts`

Allow agent to create initiatives with name, description, priority, status, owners.

#### 5.3 Update Project Tool

**File:** `/src/agent-sdk/tools/updateProject.ts`

Allow setting `initiativeId` to assign projects to initiatives.

#### 5.4 Update sendEmail Tool Description

**File:** `/src/agent-sdk/tools/sendEmail.ts`

Update description to clarify recipient types:
- Can send to initiative **owners** (people directly responsible for initiative)
- Can send to initiative **stakeholders** (aggregated from projects)
- Can send to project **contributors** (people assigned to tasks)

The tool already resolves names to emails, so usage like:
- "Email the owners of the Q1 Launch initiative"
- "Send update to all stakeholders in the Infrastructure initiative"

---

## Data Migration

For existing deployments with projects:
- All existing projects will have `initiative_id = null` (ungrouped)
- No breaking changes to existing functionality
- Projects can be organized into initiatives incrementally
- Database migration adds: `initiative` table, `initiativepersonlink` table, `project.initiative_id` column

---

## UI/UX Considerations

### Grouping Display
- Initiatives are collapsible containers
- Visual hierarchy: Initiative header → Project cards inside
- Ungrouped projects shown in a separate section
- Owner avatars shown in initiative header

### Interaction Patterns
- Click initiative header to expand/collapse
- Click project card to navigate to project (existing behavior)
- Context menu to add/remove projects from initiatives
- Owner management in initiative detail view

### Progress Aggregation
- Initiative shows aggregate progress bar (average of child projects)
- Show count: "3 of 5 projects completed"

---

## Implementation Order

1. **Backend Model** - Create Initiative model, InitiativePersonLink, update Project and Person models
2. **Backend API** - Add initiative endpoints to main.py, update project serialization
3. **Frontend Types** - Add Initiative interface, update Project interface
4. **Frontend Hook** - Create useInitiatives.js
5. **Store Update** - Add initiative state to projectStore.js
6. **UI Container** - Build InitiativeContainer component
7. **Update Views** - Integrate grouping into MomentumView
8. **Agent Tools** - Update queryPortfolio, create createInitiative, update updateProject

---

## File Summary

### New Files
- `/backend/models/initiative.py`
- `/src/hooks/useInitiatives.js`
- `/src/components/InitiativeContainer.jsx`
- `/src/agent-sdk/tools/createInitiative.ts`

### Modified Files
- `/backend/models/project.py` - Add initiative_id field and relationship
- `/backend/models/person.py` - Add owned_initiatives relationship
- `/backend/models/__init__.py` - Export Initiative, InitiativePersonLink
- `/backend/main.py` - Add initiative endpoints
- `/src/types/portfolio.ts` - Add Initiative type, update Project
- `/src/hooks/useProjects.js` - Support initiative_id
- `/src/store/projectStore.js` - Add initiative state
- `/src/views/MomentumView.jsx` - Group by initiative
- `/src/agent-sdk/tools/queryPortfolio.ts` - Add initiative queries
- `/src/agent-sdk/tools/updateProject.ts` - Support initiative assignment
- `/src/agent-sdk/tools/sendEmail.ts` - Update description for clarity
