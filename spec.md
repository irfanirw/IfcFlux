# IfcFlux — Product Requirements Document (PRD)
Version: 0.2 (MVP)  
Codename/Product name: IfcFlux  
Owner: You + Coding Agent  
Timeline: 2–4 weeks  
Deployment: **Open in browser** (static site)  
Hosting (assumption): Internal **nginx** static hosting  
Processing: **Browser-only** (no file upload)

---

## 1. Product Summary
IfcFlux is a fast, browser-based IFC 3D viewer + rules checker focused on (but not limited to) **IFC-SG schema/property validation**. It enables Architects/BIM Designers to load multiple IFC models (federation), inspect geometry + metadata, run validation rules, create BCF-style issues, and export results (Excel/PDF/BCF) — entirely locally in the browser.

---

## 2. Goals and Non-Goals

### Goals (MVP)
- Reliable render and interaction for **IFC4** and **IFC4x3**
- Multi-model federation (load 2–3 models together; toggle visibility; color by model)
- Fast inspection: select → highlight → property view; search/filter; tree browsing
- Validation checks: schema validity + required properties + value type/format checks
- Results grouped by severity; click result focuses/highlights element
- BCF-style issue creation and **BCF export**
- Excel and PDF export
- Full **local audit trail** of key actions; export audit as JSON
- **PDPA-safe**: no model data leaves device; no telemetry

### Non-Goals (MVP)
- Clash visualization/detection
- Backend services / cloud storage / multi-user collaboration
- Enterprise SSO
- Rule authoring UI (rules maintained by dev)
- Offline/PWA/installation experience (explicitly out)

---

## 3. Users / Persona
Primary: Architects / BIM Designers (internal use)  
Constraints: model files are confidential; must remain local.

---

## 4. Core User Stories (MVP)
1. Import one or more IFC files and see them rendered together in a single scene.
2. Navigate smoothly; isolate/hide elements; use X/Y/Z section clipping planes.
3. Browse model via tree by Spatial / Type / Discipline.
4. Select elements and inspect properties (identity + psets/qto); search by name/class/GlobalId.
5. Run validation and see results grouped by severity; click a result to zoom/select/highlight.
6. Create a BCF issue from current selection + viewpoint + notes; export BCF zip.
7. Export validation output to Excel and PDF.
8. Audit trail records imports/checks/exports/issues and can be exported; local data can be cleared.

---

## 5. Functional Requirements

### 5.1 Import & Federation
- Supported schemas: **IFC4, IFC4x3**
- Supports multi-model loading:
  - Add models incrementally (drag-drop or file picker)
  - Model list: visibility toggle, remove model, rename “display name”
  - Color mode “by model”
- Track per-model metadata:
  - fileName, fileSize, fileHash (SHA-256), schema, importedAt, element counts

Acceptance criteria:
- Load 2–3 IFC files and view together.
- Toggle each model’s visibility without reloading others.
- Remove a model without full scene reset.

### 5.2 3D Viewer Capabilities
Minimum:
- Orbit / pan / zoom; Fit to model; Fit to selection
- Selection highlight
- Hide / show / isolate
- **Section clipping planes** X/Y/Z with interactive offset control (gizmo or slider)
- Grid + global axis indicator
- Color modes:
  - Default
  - By model
  - By IFC class
  - By validation status (PASS/WARN/ERROR)

Acceptance criteria:
- Section plane toggles work for X/Y/Z and can be moved continuously.
- Click selection always syncs with property panel.

### 5.3 Model Tree & Search/Filter
Tree modes:
- Spatial hierarchy
- By element type/class
- By discipline (heuristic mapping)
Filters:
- Text search: Name / GlobalId / IfcClass / Tag
- Filter by model
- After validation: filter “failed only” and “by severity”

### 5.4 Properties Panel
- Show core identity: GlobalId, IfcClass, Name, ObjectType, PredefinedType
- Show Psets/Qto sets grouped and searchable
- Copy shortcuts (GlobalId, property value)
- Provide “Locate in Tree” action (optional MVP)

### 5.5 Validation / Checker
Checks (MVP):
- Schema validity (parse + basic structure)
- Required property existence (pset/property path)
- Property value type/format (type, regex, range, enum)
- Optional: naming conventions (regex)
Severities:
- INFO / WARNING / ERROR

Rule packs:
- Built-in IFC-SG preset pack (versioned)
- Import custom rule pack file (JSON + minimal IDS)

Result UX:
- Results grouped by severity (primary)
- Click result: select + zoom + highlight
- “Show only failed” toggle

Acceptance criteria:
- Rule pack runs deterministically on same file.
- Results are navigable and linked to the viewer.

### 5.6 Issues (BCF-style)
- Create issue:
  - title, description, severity, tags
  - references: GlobalId list
  - viewpoint: camera + selection + clipping planes
- Issue list: create/edit/delete locally
- Export BCF zip (best-effort BCF 2.x compatible)

Acceptance criteria:
- Create issue and export valid zip containing markup + viewpoint.

### 5.7 Export
- Excel (.xlsx): element-level detail
- PDF: summary + stats + key failures
- BCF: issues

Excel required columns:
- severity, ruleId, ruleName, modelName, IfcClass, GlobalId, elementName, propertyPath, actualValue, expected, message

PDF minimum sections:
- project/session timestamp
- rule pack name + version
- counts by severity
- top failing rules
- failures table (limited to first N rows with “export full in Excel” note)

### 5.8 Audit Trail (Full, Local)
Events to log:
- app start, import model, remove model
- validation run start/end (with rule pack version and duration)
- exports (excel/pdf/bcf)
- issue create/edit/delete
Storage:
- IndexedDB (local)
Export:
- JSON audit export
Controls:
- “Clear local data” deletes all caches/audit/issues/rule packs

Acceptance criteria:
- Audit persists across refresh and is exportable.
- Clear local data works reliably.

---

## 6. Non-Functional Requirements

### 6.1 Performance Targets (realistic)
- Target: <5s for typical internal models (small/medium).
- Large models (hundreds of MB) must:
  - keep UI responsive (no main-thread freeze)
  - provide progress indicator + cancel
  - allow partial interaction as soon as scene is available (progressive)

### 6.2 PDPA / Security
- **No uploads**: the app must not transmit IFC content anywhere.
- **No telemetry** in MVP.
- Avoid external CDN dependencies (bundle assets).
- Provide local-data wipe.

### 6.3 Compatibility
- Chrome / Edge / Safari (latest)
- WebGL2 required

### 6.4 Reliability
- Graceful handling of invalid/malformed IFC:
  - show error message and keep app usable
- Memory-conscious: avoid duplicating large buffers.

---

## 7. Tech Stack (MVP)
Frontend:
- Vite + React + TypeScript
- State: Zustand
- UI: minimal custom + Radix UI (optional)
- Layout: split panes (for dock-like behavior)
- Styling: CSS variables (+ optional Tailwind if you want speed)

3D / IFC:
- **That Open Engine** as core viewer/scene layer

Concurrency:
- Web Workers:
  - IFC parsing/indexing
  - rule checking

Local persistence:
- IndexedDB (Dexie recommended for simplicity)

Export:
- Excel: SheetJS (xlsx)
- PDF: pdf-lib
- BCF: zip.js + minimal BCF writer

Backend:
- None for MVP (static site only)
Future (document-only):
- Basic REST contract reserved for later

---

## 8. UI/UX Design (Apple-minimal, fast build)
Layout (default):
- Top bar: Import, Rule Pack, Run Validation, Export, Settings
- Left pane: Tree (tabs: Spatial/Type/Discipline)
- Center: Viewer
- Right pane: Tabs (Properties / Results / Issues)
- Status bar: progress + memory/perf hints (optional)

Docking (MVP definition):
- Resizable split panes
- Collapse/expand panes
- Remember pane sizes (local storage)

---

## 9. Data Model (Local)
IndexedDB stores:
- RulePacks
- Issues
- AuditEvents
Optional:
- Recent sessions metadata (not required for core use)

---

## 10. Acceptance Criteria (MVP “Done”)
- Multi-model import/render for IFC4 + IFC4x3
- Tree + selection + properties + isolate/hide
- Section clipping X/Y/Z works
- JSON rule pack validation + results grouped by severity
- Export Excel + PDF
- Create issues and export BCF
- Audit log persisted + exportable
- No external network calls beyond serving the app assets

---

## 11. Risks (explicit)
- “<5s for 800MB” is not guaranteed in browser. Mitigation:
  - progressive loading
  - workers
  - cancel
  - set expectation: “large models may take longer”