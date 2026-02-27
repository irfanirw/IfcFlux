# IfcFlux — Development Blueprint (v0.2)
Goal: Provide an agent-friendly engineering plan to scaffold repo + implement MVP end-to-end.

---

## A. Deployment Decision (locked)
- **Open in browser** (no PWA, no service worker)
- Static hosting (assume internal nginx serving `dist/`)
- No backend in MVP
- No external CDN calls (bundle dependencies)

---

## B. High-Level Architecture
Single-page app with local-only processing:
- React UI
- That Open Engine viewer
- Web Workers for parsing/indexing/checking
- IndexedDB for audit/issues/rulepacks
- Export services (Excel/PDF/BCF) on client

### Threading / Performance Rule
- Main thread must remain responsive.
- Any heavy parse/check/index work runs in workers.
- Viewer can render progressively; checks can run after index is ready.

---

## C. Repo Structure (scaffold this exactly)
- /ifcflux
  - /src
    - /app
      - App.tsx
      - routes.ts (optional)
      - layout/
    - /features
      - /viewer
        - viewerAdapter.ts       (wrap That Open Engine)
        - ViewerCanvas.tsx
      - /models
        - modelManager.ts        (federation meta + visibility)
      - /tree
        - TreePanel.tsx
        - treeBuilders/
      - /properties
        - PropertiesPanel.tsx
      - /checker
        - CheckerPanel.tsx
        - rulePackSchema.ts
        - checkRunner.ts         (worker bridge)
      - /issues
        - IssuesPanel.tsx
        - bcf/
      - /export
        - exportExcel.ts
        - exportPdf.ts
        - exportBcf.ts
      - /audit
        - auditLogger.ts
      - /storage
        - db.ts                  (Dexie schema)
        - repositories/
    - /workers
      - ifcIndex.worker.ts
      - checker.worker.ts
    - /shared
      - types.ts
      - utils/
      - constants/
  - /public
  - vite.config.ts
  - package.json
  - README.md

---

## D. Contracts (TypeScript Interfaces)

### D1. Viewer Adapter (That Open Engine wrapper)
Expose a stable interface to keep TOE isolated:

- init(canvas): Promise<void>
- loadIfcFile(file: File, opts?): Promise<{ modelId: string, modelName: string }>
- unloadModel(modelId): Promise<void>
- setModelVisibility(modelId, visible): void
- setColorMode(mode): void
- select(globalIds: string[]): void
- isolate(globalIds: string[]): void
- hide(globalIds: string[]): void
- showAll(): void
- fitToSelection(): void
- fitToAll(): void
- setSection(axis: "X"|"Y"|"Z", enabled: boolean): void
- setSectionOffset(axis, offsetMeters: number): void
- getViewpoint(): Viewpoint
- setViewpoint(vp: Viewpoint): void

Viewpoint minimal:
- camera position/target/up/fov
- clipping planes states + offsets
- selected GlobalIds

### D2. Worker: IFC Indexing
Input: File(s)  
Output: minimal index for fast UI operations (do not attempt full duplication of geometry)

- elementIndex: { globalId, ifcClass, name, modelId }[]
- psetIndex (optional, minimal): { globalId, keys: string[] }  // detail fetch can be on-demand via TOE/IFC API
- schema: "IFC4" | "IFC4X3" | unknown
- counts: element count by ifcClass

### D3. Worker: Checker
Input:
- rulePack (JSON)
- elementIndex
- propertyAccessor strategy:
  - For MVP: property reads can be on-demand via main thread adapter or pre-extracted maps.
  - Prefer: pre-extract minimal needed properties for checks during indexing.

Output:
- summary: counts by severity, duration
- results[]:
  - severity, ruleId, ruleName
  - modelId, globalId, ifcClass, elementName
  - propertyPath, actualValue, expected, message

### D4. Rule Pack Schema (JSON)
RulePack:
- id, name, version
- rules: Rule[]

Rule:
- ruleId, name, severity
- selector:
  - ifcClass?: string[]
  - where?: Condition[]
- assertions: Assertion[]

Assertions (MVP):
- requiredProperty: { path: "Pset_X.PropA" }
- typeIs: { path, type: "string"|"number"|"boolean" }
- regex: { path, pattern }
- range: { path, min?, max? }
- enum: { path, values: string[] }

### D5. Storage (IndexedDB via Dexie)
Tables:
- rulePacks
- issues
- auditEvents
- recentSessions (optional)

Strict rule:
- No IFC raw content stored unless user explicitly opts in later.
- Store only metadata/indexes needed for UX.

---

## E. UI Implementation Notes (fast, minimal)
- Use split panes to simulate docking:
  - Left: Tree
  - Right: Tabs (Properties / Results / Issues)
- Provide “collapse pane” buttons.
- Remember pane widths in localStorage (not IndexedDB).

---

## F. Exports

### F1. Excel
- Use SheetJS; generate:
  - Summary sheet
  - Results sheet (row per issue)
  - Issues sheet (BCF issues)

### F2. PDF
- Use pdf-lib; minimal layout (don’t overdesign):
  - Title + timestamp
  - Summary counts
  - Top failing rules
  - Sample rows
  - Reference: “See Excel for full list”

### F3. BCF
- Use zip.js to generate BCF zip:
  - markup file + viewpoint file per issue (best-effort)
- Include:
  - GlobalIds
  - camera viewpoint
  - clipping plane states

---

## G. PDPA / Security Hard Requirements
- No network calls after app loads:
  - Avoid external font/CDN fetches
  - Bundle assets locally
- Provide “Clear Local Data”:
  - wipe IndexedDB + localStorage layout prefs (optional: keep layout)
- Provide visible banner: “Local-only processing”

---

## H. Test Strategy
Unit tests:
- rule evaluation engine
- rule pack validation
- export generators (basic smoke)
Integration:
- open small sample IFC, run check, export excel/pdf/bcf
Manual:
- Safari load + navigation
- multi-model load/unload
- large model: verify responsiveness + cancel works

---

## I. Task Plan (Agent Execution Order)
1) Repo scaffold: Vite+React+TS, lint/format, split-pane layout, basic navigation
2) Viewer adapter: TOE init + load single IFC file + orbit/pan/zoom + selection
3) Multi-model: load multiple IFCs + model list visibility toggles + color by model
4) Tree: spatial/type/discipline builders from elementIndex
5) Properties: identity + psets render on selection
6) Section planes: X/Y/Z enable + offset controls
7) Workers: indexing worker producing elementIndex + schema + counts
8) Checker: JSON rule pack loader + checker worker + results panel grouped by severity
9) Viewer linkage: click result -> select + zoom + highlight + filter “failed only”
10) Issues: create issue from selection + viewpoint; list issues
11) Exports: Excel + PDF + BCF
12) Audit trail: event logger + export JSON + clear local data
13) Hardening: error handling, cancel operations, progress UI, memory guardrails

---

## J. Coding Agent Prompt Pack (v0.2)

### Prompt 1 — Scaffold
Scaffold a Vite + React + TypeScript repo named IfcFlux using the repo structure in this blueprint.
Include:
- Zustand store
- split-pane layout with left tree, center viewer, right tabs
- light/dark toggle
- no service worker / no PWA
Return a runnable app.

### Prompt 2 — That Open Engine Viewer Adapter
Integrate That Open Engine behind a viewerAdapter that matches the Viewer Adapter interface.
Implement:
- init(canvas)
- loadIfcFile(File)
- basic navigation
- selection callbacks
Return a demo screen: import IFC -> render -> select element -> show GlobalId.

### Prompt 3 — Multi-model Federation
Add support for loading multiple IFC files into one scene.
Implement:
- model list UI
- visibility toggle per model
- color mode: BY_MODEL
Return working federation.

### Prompt 4 — Index Worker + Tree
Implement ifcIndex.worker:
- produce elementIndex + schema + counts
Build TreePanel modes:
- Spatial
- Type
- Discipline (heuristic)
Wire selection from tree -> viewer.

### Prompt 5 — Properties Panel
Implement properties panel to show:
- identity + psets/qto
- search within properties
Ensure selection sync (viewer <-> UI).

### Prompt 6 — Section Planes
Implement:
- section plane enable for X/Y/Z
- offset control (slider + optional gizmo)
Persist section state in app store.

### Prompt 7 — Rule Engine + Results UI
Implement JSON rule pack schema and checker.worker.
Implement:
- run validation
- results grouped by severity
- click result selects + zooms/highlights
- filter “failed only”

### Prompt 8 — Issues + BCF Export
Implement:
- create issue from selection + viewpoint
- list/edit/delete issues locally
- export BCF zip via zip.js (best-effort)

### Prompt 9 — Excel/PDF Export + Audit + Clear Data
Implement:
- Excel export with required columns
- PDF export summary
- audit events (append-only) stored in IndexedDB
- export audit JSON
- clear local data action
Also: enforce no external network calls beyond app asset load (no CDNs).

---

## K. Hosting Note (assumption)
Static hosting on internal nginx:
- Serve `/dist` with SPA fallback to `index.html`
- Cache static assets, but do not cache IndexedDB