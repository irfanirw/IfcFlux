# IfcFlux MVP

IfcFlux is a local-first **Federated IFC+SG Viewer, Validator, and Editor** for CORENET X preparation.

## Included MVP capabilities

- Multi-file IFC upload with discipline inference (ARC/STR/MEP/OTHER)
- Federated model list with visibility toggles and alignment warnings
- Search + object tree navigation (GUID/type/name/material)
- Properties + Pset inspector with inline editable fields
- Configurable IFC+SG baseline rule-pack validation and issue report
- Click-to-focus issue workflow
- Data-only export of edited IFC content (`*_edited.ifc`)
- Dirty-state warning on browser unload

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
