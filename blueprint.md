# IfcFlux — Development Blueprint (v0.3)
Agent-friendly engineering spec to scaffold repo and implement MVP.

---

## A) Locked Decisions
- Open in browser (no PWA/service worker)
- Static hosting (nginx assumed)
- Browser-only IFC processing
- Multi-model federation
- Property lookup prioritizes `Pset_*Common`
- Rulepack JSON supports RP001–RP007 criteria including `name_matches_mapping`  [oai_citation:15‡ifcsg_rulepack.json](sediment://file_0000000057087208880655eb0b13091b)
- Industry Mapping XLSX import drives RP002

---

## B) Architecture
- SPA (React)
- Viewer module wraps That Open Engine (TOE)
- Web Workers:
  - IFC indexing (element index + minimal property index)
  - Checker (rule evaluation)
- IndexedDB (Dexie):
  - rule packs
  - mapping allowlist (derived from XLSX)
  - issues
  - audit events

---

## C) Repo Structure (add mapping module)
- /src/features
  - /mapping
    - MappingImportPanel.tsx
    - mappingParser.ts      (XLSX → allowlist)
    - allowlistTypes.ts
  - /checker
    - rulePackSchema.ts
    - ruleInterpreter.ts   (criteria implementations)
    - checkRunner.ts       (worker bridge)
  - /workers
    - ifcIndex.worker.ts
    - checker.worker.ts

---

## D) Data Contracts

### D1) Allowlist (internal)
```ts
type Allowlist = {
  version: string; // from filename or timestamp
  entities: Record<string, {
    psets: Record<string, {
      props: Record<string, { type?: string; unit?: string; accepted?: string }>
    }>
  }>
}

check result
type CheckResult = {
  status: "FAIL" | "PASS" | "SKIPPED";
  severity?: "ERROR" | "WARNING" | "INFO"; // only if FAIL
  ruleId: string;
  ruleName: string;
  modelId: string;
  globalId?: string;
  ifcClass?: string;
  elementName?: string;
  propertyPath?: string;  // e.g. "Pset_WallCommon.FireRating"
  actualValue?: any;
  expected?: string;
  message?: string;
  skippedReason?: string;
}
