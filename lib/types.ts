export type Discipline = "ARC" | "STR" | "MEP" | "OTHER";

export type ModelStatus = "uploading" | "converting" | "ready" | "failed";

export interface ElementProperty {
  name: string;
  value: string;
  editable?: boolean;
}

export interface PropertySet {
  name: string;
  properties: ElementProperty[];
}

export interface ElementNode {
  globalId: string;
  expressId: number;
  ifcType: string;
  name: string;
  material: string;
  storey: string;
  properties: ElementProperty[];
  psets: PropertySet[];
}

export interface ModelFile {
  modelId: string;
  originalFileName: string;
  discipline: Discipline;
  status: ModelStatus;
  visible: boolean;
  fileHash: string;
  fileSize: number;
  alignmentWarning?: string;
  elements: ElementNode[];
  dirty: boolean;
  lastValidatedAt?: string;
}

export interface Rule {
  ruleId: string;
  selector: { ifcTypes: string[] };
  psetName: string;
  propertyName: string;
  checkType: "presence" | "nonEmpty" | "allowedValues" | "regex";
  allowedValues?: string[];
  regex?: string;
  severity: "critical" | "major" | "minor";
  messageTemplate: string;
  fixHint: string;
}

export interface RulePack {
  id: string;
  name: string;
  version: string;
  rules: Rule[];
}

export interface Issue {
  issueId: string;
  modelId: string;
  severity: "critical" | "major" | "minor";
  ruleId: string;
  message: string;
  elementRef: { globalId: string; expressId: number; ifcType: string };
}
