# Copilot Instructions — IfcFlux

## Product Overview

IfcFlux is a **client-side BIM/VDC QA/QC web app** (React + TypeScript + Vite). All file processing happens in the browser — no server uploads. It targets desktop Chrome, Edge, and Safari, handling IFC files up to ~800 MB (best effort).

**Core capabilities (4 milestones):**
1. **MVP-1 — Viewer:** Upload `.ifc`, 3D viewport with Rhino-like grid/world axis, spatial + type trees, read-only Pset inspector
2. **MVP-2 — Edit + Export:** Edit `Pset_*Common` values (single + batch), export modified IFC (patch-first, rewrite fallback), preserve header comments
3. **MVP-3 — Validation + Reports:** IFC+SG versioned rule pack + IDS XML import, validation engine, XLSX + PDF reports
4. **MVP-4 — Section Tool:** ACC-style orthogonal clipping planes (X/Y/Z), movable control panel

## Tech Stack

| Layer | Library | Import alias |
|-------|---------|--------------|
| Frontend | React 18+, TypeScript, Vite | — |
| UI | Ant Design (`antd`) | — |
| Testing | Vitest | — |
| State | Zustand (+ optional immer) | — |
| BIM engine | `@thatopen/components` | `OBC` |
| BIM frontend tools | `@thatopen/components-front` | `OBF` |
| Fragments format | `@thatopen/fragments` | `FRAGS` |
| IFC WASM parser | `web-ifc` | `WEBIFC` |
| Reports XLSX | `exceljs` | — |
| Reports PDF | `pdf-lib` | — |
| IndexedDB | `idb` | — |

## Architecture

### Layout (strict 3-panel)
```
┌──────────────────────────────────────────────────────┐
│  Ribbon (thin strip: view presets, projection,       │
│  display, zoom controls, grid/axis toggles, section) │
├────────┬─────────────────────────────┬───────────────┤
│ Left   │  3D Viewport (center)       │ Right bar     │
│ bar    │  - Three.js scene           │ - Element     │
│ - Tabs │  - Grid (XY, 1m/5m)        │   inspector   │
│   1.   │  - World axis at origin    │ - Pset editor │
│  Spatial│  - Axis helper (BL corner) │   (Pset_*     │
│  tree  │  - Selection highlight     │   Common only)│
│   2.   │    (transparent blue)       │ - Batch edit  │
│  Type  │                             │   mode        │
│  tree  │                             │               │
│   3.   │                             │               │
│  Search│                             │               │
│  +Filter│                            │               │
├────────┴─────────────────────────────┴───────────────┤
│  (Validation issues panel / report controls)         │
└──────────────────────────────────────────────────────┘
```

### Data Flow
```
.ifc file → IfcLoader (Web Worker, WASM) → Fragments model → 3D scene
                                         → Property extraction → Pset editor
                                         → Validation engine → Issues list
                                         → Modified IFC export (patch/rewrite)
                                         → Report generation (XLSX/PDF)
```

### Key That Open Engine Patterns

**All components are singletons.** Always retrieve via `components.get(OBC.ComponentClass)`, never `new`:
```ts
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);
const world = worlds.create<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>();

world.scene = new OBC.SimpleScene(components);
world.renderer = new OBF.PostproductionRenderer(components, container);
world.camera = new OBC.OrthoPerspectiveCamera(components);
components.init();
world.scene.setup();
```

**FragmentsManager requires worker initialization before any model loading:**
```ts
const fragments = components.get(OBC.FragmentsManager);
fragments.init(workerUrl); // MUST call before loading any model

// Hook camera updates for LOD
world.camera.controls.addEventListener("update", () => fragments.core.update());

// Register model into scene when loaded
fragments.list.onItemSet.add(({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  fragments.core.update(true);
});
```

**IFC Loading (IFC → Fragments conversion):**
```ts
const ifcLoader = components.get(OBC.IfcLoader);
await ifcLoader.setup({ autoSetWasm: false, wasm: { path: "/wasm/", absolute: false } });
const buffer = new Uint8Array(arrayBuffer);
await ifcLoader.load(buffer, false, "modelName");
```

**Clipper for section planes (MVP-4) — use `createFromNormalAndCoplanarPoint`:**
```ts
const clipper = components.get(OBC.Clipper);
clipper.enabled = true;
// Create programmatic section planes (X/Y/Z):
const planeId = clipper.createFromNormalAndCoplanarPoint(world, new THREE.Vector3(1, 0, 0), new THREE.Vector3(offset, 0, 0));
// Toggle/delete:
const plane = clipper.list.get(planeId);
plane.enabled = false; // disable without deleting
clipper.deleteAll(); // clear all
```

**IDS validation (MVP-3):**
```ts
const ids = components.get(OBC.IDSSpecifications);
// Load IDS XML:
const specs = ids.load(idsXmlString);
// Create programmatic spec:
const spec = ids.create("Rule Name", ["IFC4"]);
const entity = new OBC.IDSEntity(components, { type: "simple", parameter: "IFCDOOR" });
const property = new OBC.IDSProperty(components,
  { type: "simple", parameter: "Pset_DoorCommon" },
  { type: "simple", parameter: "FireRating" }
);
spec.applicability.add(entity);
spec.requirements.add(property);
const result = await spec.test([/modelId/]);
const { pass, fail } = ids.getModelIdMap(result);
```

**Classifier for spatial/type trees:**
```ts
const classifier = components.get(OBC.Classifier);
await classifier.byCategory();          // group by IFC class (type tree)
await classifier.byIfcBuildingStorey(); // group by storey (spatial tree)
```

**Grids:**
```ts
const grids = components.get(OBC.Grids);
const grid = grids.create(world);
```

### Disposal
Always dispose components on React unmount to prevent Three.js memory leaks:
```ts
useEffect(() => {
  const components = new OBC.Components();
  // ... setup ...
  return () => components.dispose();
}, []);
```

## Project Conventions

### Directory Structure (target)
```
src/
├── components/          # React UI components
│   ├── viewport/        # 3D viewport, ribbon, grid, axis helpers
│   ├── left-bar/        # Spatial tree, type tree, search/filter, validation
│   ├── right-bar/       # Element inspector, Pset editor
│   └── common/          # Shared UI (buttons, dialogs, etc.)
├── engine/              # That Open Engine wrappers and setup
│   ├── setup.ts         # Components + World initialization
│   ├── loader.ts        # IFC loading with worker
│   ├── classifier.ts    # Spatial/type tree data
│   ├── clipper.ts       # Section plane management (MVP-4)
│   └── fragments-worker.ts
├── validation/          # Validation engine
│   ├── ids-runner.ts    # IDS-based validation
│   ├── ifcsg-rules/     # Versioned IFC+SG rule packs
│   └── types.ts         # ValidationIssue, Severity enums
├── export/              # IFC export + reports
│   ├── ifc-patcher.ts   # Patch-first IFC export
│   ├── ifc-rewriter.ts  # Full rewrite fallback
│   ├── xlsx-report.ts   # ExcelJS report generation
│   └── pdf-report.ts    # pdf-lib report generation
├── store/               # Zustand stores
│   ├── model-store.ts   # Loaded model state, selection
│   ├── editor-store.ts  # Pset edit state, undo stack
│   └── validation-store.ts
├── types/               # Shared TypeScript types
│   ├── ifc.ts           # IFC-specific types, Discipline enum
│   └── pset.ts          # Pset_*Common field definitions
├── utils/               # Pure utility functions
│   ├── discipline-map.ts # IFC class → Architecture/Structure/MEP
│   └── zone-resolver.ts  # IfcSpace containment → zone string
├── workers/             # Web Workers
│   ├── ifc-parse.worker.ts
│   └── validation.worker.ts
└── App.tsx
```

### Naming
- React components: PascalCase files and exports (`SpatialTree.tsx`)
- Hooks: `use` prefix (`useModelStore.ts`)
- Engine wrappers: camelCase (`setup.ts`, `loader.ts`)
- Zustand stores: `*-store.ts` pattern
- Types: PascalCase interfaces, `I` prefix NOT used

### State Management (Zustand)
Separate stores by domain. Keep engine state (Three.js objects) OUT of Zustand — use refs or module-level singletons. Zustand only for UI-reactive state:
```ts
// ✅ Good: UI state in Zustand
interface ModelStore {
  selectedIds: Set<number>;
  loadingState: "idle" | "parsing" | "rendering" | "loaded" | "error";
}
// ❌ Bad: Three.js objects in Zustand (not serializable, causes re-renders)
```

## Domain Rules (Locked)

### Editable Properties
Only `Pset_*Common` property sets are editable (e.g., `Pset_WallCommon`, `Pset_DoorCommon`, `Pset_SlabCommon`). All other Psets are **read-only**.

### Pset_*Common Families (exhaustive)

| Pset | Applies to | Key Properties |
|------|-----------|----------------|
| `Pset_WallCommon` | IfcWall | Reference, Status, AcousticRating, FireRating, Combustible, SurfaceSpreadOfFlame, ThermalTransmittance, IsExternal, LoadBearing, ExtendToStructure, Compartmentation |
| `Pset_DoorCommon` | IfcDoor | Reference, Status, FireRating, AcousticRating, IsExternal, Infiltration, ThermalTransmittance, GlazingAreaFraction, HandicapAccessible, FireExit, SelfClosing, SmokeStop, SecurityRating |
| `Pset_WindowCommon` | IfcWindow | Reference, Status, FireRating, AcousticRating, IsExternal, Infiltration, ThermalTransmittance, GlazingAreaFraction, SmokeStop, HasSillExternal, HasSillInternal, HasDrive, SelfClosing |
| `Pset_SlabCommon` | IfcSlab | Reference, Status, FireRating, AcousticRating, IsExternal, LoadBearing, Combustible, SurfaceSpreadOfFlame, ThermalTransmittance, Compartmentation, PitchAngle |
| `Pset_BeamCommon` | IfcBeam | Reference, Status, FireRating, IsExternal, LoadBearing, Span |
| `Pset_ColumnCommon` | IfcColumn | Reference, Status, FireRating, IsExternal, LoadBearing, Slope |
| `Pset_RoofCommon` | IfcRoof | Reference, Status, FireRating, AcousticRating, IsExternal, ThermalTransmittance, ProjectedArea, TotalArea |
| `Pset_StairCommon` | IfcStair | Reference, Status, FireRating, FireExit, IsExternal, NosingLength, NumberOfRiser, NumberOfTreads, RiserHeight, TreadLength, TreadLengthAtOffset, TreadLengthAtInnerSide, HandicapAccessible, RequiredHeadroom |
| `Pset_RailingCommon` | IfcRailing | Reference, Status, FireRating, IsExternal, Height, Diameter |
| `Pset_CurtainWallCommon` | IfcCurtainWall | Reference, Status, FireRating, AcousticRating, IsExternal, ThermalTransmittance |
| `Pset_BuildingStoreyCommon` | IfcBuildingStorey | Reference, EntranceLevel, AboveGround, SprinklerProtection, SprinklerProtectionAutomatic, LoadBearingCapacity, GrossPlannedArea, NetPlannedArea |
| `Pset_SpaceCommon` | IfcSpace | Reference, IsExternal, GrossPlannedArea, NetPlannedArea, PubliclyAccessible, HandicapAccessible |
| `Pset_MemberCommon` | IfcMember | Reference, Status, FireRating, IsExternal, LoadBearing, Span, Slope |
| `Pset_PlateCommon` | IfcPlate | Reference, Status, FireRating, AcousticRating, IsExternal, LoadBearing, ThermalTransmittance |
| `Pset_FootingCommon` | IfcFooting | Reference, Status, LoadBearing |
| `Pset_PileCommon` | IfcPile | Reference, Status, LoadBearing |
| `Pset_CoveringCommon` | IfcCovering | Reference, Status, FireRating, AcousticRating, FlammabilityRating, SurfaceSpreadOfFlame, Combustible, ThermalTransmittance, IsExternal, Finish |
| `Pset_RampCommon` | IfcRamp | Reference, Status, FireRating, FireExit, IsExternal, HandicapAccessible, RequiredHeadroom, RequiredSlope |

### Validation Severity (fixed mapping)
| Condition | Severity |
|-----------|----------|
| Missing value (property exists, empty/null) | **Warning** |
| Naming convention violation ("typo") | **Error** |
| Missing parameter (property absent) | **Error** |
| Wrong values (constraint violation) | **Error** |

### Zone Derivation
Zone = containing `IfcSpace`. Prefer `IfcSpace.Name`, fallback to `IfcSpace.LongName`. Multiple spaces joined with `;`.

### Discipline Mapping
Derived from IFC class:
- **Architecture:** IfcWall, IfcDoor, IfcWindow, IfcSlab, IfcRoof, IfcStair, IfcRailing, IfcCurtainWall, IfcSpace
- **Structure:** IfcBeam, IfcColumn, IfcFooting, IfcPile, IfcReinforcingBar
- **MEP:** IfcPipeSegment, IfcDuctSegment, IfcFlowTerminal, IfcFlowFitting

### ElementId Resolution
`Tag` if present → else `Name` → else `GlobalId`

### IFC Export
1. **Patch export (preferred):** Minimal text replacement on original STEP file, preserve header comments
2. **Rewrite export (fallback):** Full re-serialization if patching fails. Warn user about formatting changes.

### IFC+SG Rule Pack (Singapore CORENET X)

**IFC+SG** is Singapore's extension of the IFC openBIM standard, developed under **CORENET X** (Singapore's digital regulatory approval platform for building works). It adds local regulatory property requirements on top of standard IFC.

**Key concepts:**
- **IFC+SG = IFC + Singapore-specific property sets & subtypes.** Models submitted to CORENET X must contain standard IFC entities enriched with `Pset_SG_*` properties for regulatory compliance.
- **Three disciplines:** Architecture, Civil & Structural (C&S), Mechanical & Electrical (M&E) — each has its own identified components and required properties.
- **Three submission gateways:** Design Gateway, Construction Gateway, Completion Gateway — each requires progressively more data.
- **Federated models:** Multi-discipline IFC files geo-referenced to SVY21 (EPSG:3414) coordinate system with Singapore Height Datum (SHD). One `IfcSite` per IFC file.
- **Automated Model Checker:** CORENET X validates models against regulatory requirements (geometric/spatial checks, property presence, naming conventions).
- **COP versioning:** Code of Practice is versioned (current: 3.1 Edition 2025-12). Rule packs in IfcFlux should reference the COP version they target.

**Rule pack structure in IfcFlux (`src/validation/ifcsg-rules/`):**
```
ifcsg-rules/
├── v3.1/                    # Matches COP edition
│   ├── architecture.ts      # Arch discipline rules
│   ├── structural.ts        # C&S discipline rules
│   ├── mep.ts               # M&E discipline rules
│   └── index.ts             # Aggregates all discipline rules
├── common.ts                # Cross-discipline rules (geo-ref, IfcSite, naming)
└── types.ts                 # IfcSgRule interface, gateway enum
```

**Rule implementation pattern:**
```ts
interface IfcSgRule {
  id: string;                          // e.g. "SG-ARCH-WALL-001"
  copVersion: string;                  // e.g. "3.1"
  discipline: "Architecture" | "C&S" | "M&E";
  gateway: "Design" | "Construction" | "Completion";
  description: string;
  ifcEntity: string;                   // e.g. "IFCWALL"
  requiredPset?: string;               // e.g. "Pset_SG_WallCommon"
  requiredProperties?: string[];       // property names within the Pset
  validate: (element: any) => ValidationIssue | null;
}
```

**Key IFC+SG validation checks:**
1. Required `Pset_SG_*` properties present on identified components
2. Correct IFC entity subtypes used for Singapore building elements
3. Geo-referencing to SVY21 coordinate system (EPSG:3414)
4. One `IfcSite` per file (no duplicate sites from linked files)
5. All elements referenced to a level datum (no unreferenced items)
6. Naming conventions per COP guidelines

**Reference:** [CORENET X IFC+SG Resource Toolkit](https://info.corenet.gov.sg/ifc-sg/bim-data-(ifc-sg)/ifc-sg-resource-toolkit)

## Viewport Requirements

### Grid (Rhino-like)
- Plane: World XY (locked), default ON
- Spacing: 1 m minor lines, 5 m major lines
- Center lines (X/Y axes) emphasized
- Toggle via ribbon

### World Axis at Origin
- X=Red, Y=Green, Z=Blue at world origin
- Non-selectable, not in element lists, default ON

### Axis Helper (corner widget)
- Bottom-left corner orientation reference
- Same color convention (Z=Blue, X=Red, Y=Green)

### Selection
- Highlight: transparent blue
- Multi-select: Click=single, Ctrl/Cmd=toggle, Shift=range in lists

## Performance Guidelines

- Use **Web Workers** for IFC parsing and validation — never block the main thread
- **FragmentsManager** handles LOD and chunking automatically — hook camera updates
- Apply **z-fighting fix** on all materials:
  ```ts
  fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
    if (!("isLodMaterial" in material && material.isLodMaterial)) {
      material.polygonOffset = true;
      material.polygonOffsetUnits = 1;
      material.polygonOffsetFactor = Math.random();
    }
  });
  ```
- Use IndexedDB (`idb`) for caching fragments and IDS rules
- Target: UI responsive during parse/validate for files up to 800 MB

## Testing (Vitest)

### Setup
- Test runner: **Vitest** with `jsdom` environment for component tests
- Config: `vitest.config.ts` at project root (extends `vite.config.ts`)
- Coverage: `@vitest/coverage-v8`

### File Conventions
- Test files: `*.test.ts` or `*.test.tsx` — colocated next to source files
- Test utils/fixtures: `src/__test-utils__/`
- Example: `src/engine/loader.ts` → `src/engine/loader.test.ts`

### What to Test
| Layer | Strategy |
|-------|----------|
| `src/engine/` | Unit tests for wrappers; mock `@thatopen/components` singletons |
| `src/store/` | Test Zustand stores directly (create fresh store per test) |
| `src/validation/` | Unit tests for each rule; use fixture IFC property objects |
| `src/export/` | Unit tests for patch logic; snapshot tests for STEP output |
| `src/utils/` | Pure function unit tests (discipline-map, zone-resolver) |
| `src/components/` | Light component tests with `@testing-library/react`; avoid testing Three.js rendering |

### Patterns
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Zustand store test — create isolated store per test
import { createModelStore } from "../store/model-store";

describe("ModelStore", () => {
  it("should update loading state", () => {
    const store = createModelStore();
    store.getState().setLoadingState("parsing");
    expect(store.getState().loadingState).toBe("parsing");
  });
});

// Validation rule test
describe("SG-ARCH-WALL-001", () => {
  it("should flag missing FireRating", () => {
    const element = { psets: { Pset_WallCommon: { Reference: "W-01" } } };
    const issue = rule.validate(element);
    expect(issue).not.toBeNull();
    expect(issue?.severity).toBe("error");
  });
});
```

### Running Tests
```bash
npm run test             # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run type-check   # TypeScript type checking
```

## Key References

- [That Open Engine Docs](https://docs.thatopen.com/)
- [That Open Engine API](https://docs.thatopen.com/api)
- [engine_components repo](https://github.com/ThatOpen/engine_components) — reference examples in `packages/core/src/*/example.ts`
- [IDS Specification (buildingSMART)](https://github.com/buildingSMART/IDS)
- [web-ifc](https://github.com/ThatOpen/engine_web-ifc)
- [CORENET X Code of Practice](https://info.corenet.gov.sg/overview/about-corenet-x/corenet-x-code-of-practice) — IFC+SG rule pack reference (COP 3.1)
