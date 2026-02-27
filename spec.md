# IfcFlux — Product Requirements Document (PRD)
Version: 0.3 (MVP)  
Product: IfcFlux  
Owner: You + Coding Agent  
Timeline: 2–4 weeks  
Deployment: Open in browser (static site)  
Processing: Browser-only (no file upload)

---

## 1) Product Summary
IfcFlux is a fast, browser-based IFC 3D viewer + rules checker for **IFC4 / IFC4x3**, focused on **IFC-SG schema/property validation** before internal submission. It supports multi-model federation, element inspection, validation runs, BCF-style issues, and exports (Excel/PDF/BCF).

Core idea: “Perfect render + perfect inspection + perfect validation run” for internal QA.

---

## 2) Goals and Non-Goals

### Goals (MVP)
- Multi-model IFC4/IFC4x3 viewing & navigation
- Minimal Apple-style UI with resizable “dock-like” panels
- Section clipping planes X/Y/Z
- Model tree (Spatial / Type / Discipline) + search/filter
- Property inspection (identity + psets/qto)
- Validation rule engine:
  - schema validity
  - required property presence
  - property value format/type checks
  - property-set assignment checks
  - mapping-based spelling/allowlist checks using **Industry Mapping XLSX**
- Results grouped by severity and linked to 3D selection/zoom
- BCF-style issues creation + export
- Excel/PDF exports for validation output
- Full local audit trail + export as JSON
- PDPA-safe: local-only, no telemetry

### Non-Goals (MVP)
- Clash visualization/detection
- Backend/cloud storage/multi-user workflows
- Enterprise SSO
- Rule authoring UI (dev maintained rule files)
- PWA/offline install (explicitly out)

---

## 3) Target Users
Primary: Architects / BIM Designers (internal)  
Constraints: confidential IFC files; keep processing local.

---

## 4) Inputs (MVP)
### 4.1 IFC Models
- Supported: IFC4 and IFC4x3
- Multi-model federation (load 2–3 models together; toggle per model)

### 4.2 Rule Pack (IFC-SG preset)
- JSON rules file with IDs RP001–RP007 and criteria types including:
  - `not_empty`, `positive_number`, `pset=...`, `name_matches_mapping`  [oai_citation:0‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)  [oai_citation:1‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)
- Built-in preset includes:
  - RP001 Element_ID not empty  [oai_citation:2‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)
  - RP002 property name spelling vs mapping file  [oai_citation:3‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)
  - RP003 FireRating must be in Pset_WallCommon  [oai_citation:4‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)
  - RP004 AirChangeRate not empty (IfcSpace)  [oai_citation:5‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)
  - RP005 Length/Breadth/Height positive  [oai_citation:6‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)
  - RP006 MP_Category not empty  [oai_citation:7‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)
  - RP007 GreaseTrapSize/OdorControlSystem not empty  [oai_citation:8‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)

### 4.3 Industry Mapping (XLSX allowlist)
- User imports an XLSX “industry mapping” file (attached) used as the authoritative allowlist for RP002.
- MVP must support configurable sheet/column selection with defaults:
  - Entity column (e.g., IFC entity/class)
  - Property Set column
  - Property Name column
- The app converts XLSX → internal allowlist data structure and uses it during validation.

---

## 5) Property Resolution Rules (important)
Your convention: prioritize **`Pset_*Common`**.

When retrieving a property value for checks:
1) Check IFC built-in attributes (Name/Tag/ObjectType/PredefinedType) if matching requested property name.
2) Search psets matching regex `^Pset_.*Common$` first.
3) Then search any remaining psets as fallback.

For rules with explicit pset criteria (e.g., RP003), the pset constraint takes priority.  [oai_citation:9‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)

---

## 6) Functional Requirements

### 6.1 Viewer
- Orbit/pan/zoom; Fit to all; Fit to selection
- Selection highlight; hide/show/isolate selection
- X/Y/Z section clipping planes + continuous offset control
- Grid + global axis indicator
- Color modes: Default / By Model / By IFC Class / By Validation Status

### 6.2 Tree / Filter / Search
- Tree modes: Spatial / Type / Discipline
- Search: Name, GlobalId, IfcClass, Tag
- Filters: by model, by severity status after check

### 6.3 Properties Panel
- Identity + psets/qto grouped
- Copy GlobalId / copy property value

### 6.4 Validation Engine
- Runs in browser-first model
- Outputs results grouped by severity (INFO/WARNING/ERROR)
- Supports rule criteria used by the preset rulepack:
  - `not_empty` (fail if missing or empty)
  - `positive_number` (fail if missing/non-numeric/<=0)
  - `pset=Pset_WallCommon` (warn if property exists but not in specified pset)  [oai_citation:10‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)
  - `name_matches_mapping`:
    - requires Industry Mapping allowlist; otherwise rule becomes SKIPPED with reason “mapping not loaded”  [oai_citation:11‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)

#### Rule Statuses
Each rule result per element can be:
- PASS
- FAIL (with severity)
- SKIPPED (with reason)

### 6.5 Industry Mapping Import UI
- Settings → “Import Industry Mapping (XLSX)”
- After import show:
  - mapping loaded indicator
  - allowlist summary counts (entities/psets/properties)
- A “clear mapping” action (local)

### 6.6 Issues (BCF-style)
- Create issue from selection + viewpoint + notes
- Local issue list
- Export BCF zip

### 6.7 Export
- Excel: detailed results (element-level)
- PDF: summary + top failing rules + sample list
- BCF: exported issues zip

### 6.8 Audit Trail (Full, local)
- Log: imports, validation run start/end, exports, issue create/edit/delete
- Persist locally; export audit JSON
- “Clear local data” for PDPA hygiene

---

## 7) Non-Functional Requirements
- Keep UI responsive: parsing/checking must not freeze main thread (workers)
- PDPA-safe: no telemetry; no IFC upload; no external CDN dependencies
- Browser support: Chrome/Edge/Safari latest; WebGL2 required
- Large file behavior: progressive feedback + cancel actions; best-effort performance

---

## 8) Tech Stack (MVP)
- Vite + React + TypeScript
- State: Zustand
- Layout: split panes (dock-like)
- Local storage: IndexedDB (Dexie recommended)
- Workers: parse/index/check
- 3D: **That Open Engine**
- Exports: SheetJS (xlsx), pdf-lib, zip.js (BCF)

Backend: none in MVP (static hosting only)

---

## 9) Acceptance Criteria (MVP Done)
- Multi-model IFC4/IFC4x3 load + stable render
- Section clipping X/Y/Z works
- Tree + selection + properties works
- Rulepack RP001–RP007 runs with correct criteria behaviors  [oai_citation:12‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)  [oai_citation:13‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)
- RP002 uses imported XLSX mapping; if mapping not loaded, RP002 is SKIPPED  [oai_citation:14‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)
- Exports: Excel + PDF + BCF work
- Audit log persists and exports; clear local data works
- No network calls beyond serving app assets