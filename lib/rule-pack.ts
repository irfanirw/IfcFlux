import { RulePack } from "@/lib/types";

export const baselineRulePack: RulePack = {
  id: "ifc-sg-baseline",
  name: "IFC+SG Baseline",
  version: "0.1.0",
  rules: [
    {
      ruleId: "door-fire-rating",
      selector: { ifcTypes: ["IfcDoor"] },
      psetName: "Pset_DoorCommon",
      propertyName: "FireRating",
      checkType: "nonEmpty",
      severity: "critical",
      messageTemplate: "Door must include non-empty FireRating for IFC+SG readiness.",
      fixHint: "Set FireRating in Pset_DoorCommon."
    },
    {
      ruleId: "wall-load-bearing-boolean",
      selector: { ifcTypes: ["IfcWall"] },
      psetName: "Pset_WallCommon",
      propertyName: "LoadBearing",
      checkType: "allowedValues",
      allowedValues: ["TRUE", "FALSE"],
      severity: "major",
      messageTemplate: "Wall LoadBearing should be TRUE or FALSE.",
      fixHint: "Correct Pset_WallCommon.LoadBearing value."
    },
    {
      ruleId: "name-regex",
      selector: { ifcTypes: ["IfcWall", "IfcDoor", "IfcSlab"] },
      psetName: "Identity",
      propertyName: "Name",
      checkType: "regex",
      regex: "^[A-Za-z0-9_\\-:. ]{3,}$",
      severity: "minor",
      messageTemplate: "Name contains unsupported characters or is too short.",
      fixHint: "Use at least 3 valid characters for Name."
    }
  ]
};
