import { Discipline, ElementNode, ModelFile } from "@/lib/types";

const ifcTypes = ["IfcWall", "IfcDoor", "IfcSlab", "IfcColumn", "IfcBeam"];
const materials = ["Concrete", "Steel", "Aluminum", "Timber"];

const randomFromHash = (seed: string, mod: number) =>
  seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % mod;

export const hashFile = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const inferDiscipline = (name: string): Discipline => {
  const n = name.toUpperCase();
  if (n.includes("ARC")) return "ARC";
  if (n.includes("STR")) return "STR";
  if (n.includes("MEP") || n.includes("HVAC")) return "MEP";
  return "OTHER";
};

export const generateElements = (hash: string, baseName: string): ElementNode[] => {
  const count = 20 + randomFromHash(hash, 35);
  return Array.from({ length: count }).map((_, idx) => {
    const ifcType = ifcTypes[(idx + randomFromHash(hash, 5)) % ifcTypes.length];
    const mat = materials[(idx + randomFromHash(hash, 7)) % materials.length];
    const gid = `${baseName}_${hash}_${idx}`;
    return {
      globalId: gid,
      expressId: idx + 1,
      ifcType,
      name: `${ifcType.replace("Ifc", "")}-${idx + 1}`,
      material: mat,
      storey: `L${(idx % 6) + 1}`,
      properties: [
        { name: "Name", value: `${ifcType}-${idx + 1}`, editable: true },
        { name: "GlobalId", value: gid },
        { name: "Material", value: mat, editable: true },
        { name: "Type", value: ifcType },
        { name: "Volume", value: `${(idx * 0.33 + 2).toFixed(2)} m³` }
      ],
      psets: [
        {
          name: "Identity",
          properties: [{ name: "Name", value: `${ifcType}-${idx + 1}`, editable: true }]
        },
        {
          name: ifcType === "IfcDoor" ? "Pset_DoorCommon" : "Pset_WallCommon",
          properties: [
            { name: ifcType === "IfcDoor" ? "FireRating" : "LoadBearing", value: idx % 3 === 0 ? "" : "TRUE", editable: true }
          ]
        }
      ]
    };
  });
};

export const createModel = (file: File, hash: string): ModelFile => {
  const baseName = file.name.replace(/\.ifc$/i, "") || "Model";
  const drift = randomFromHash(hash, 3);
  return {
    modelId: crypto.randomUUID(),
    originalFileName: file.name,
    discipline: inferDiscipline(file.name),
    status: "ready",
    visible: true,
    fileHash: hash,
    fileSize: file.size,
    dirty: false,
    alignmentWarning:
      drift === 0 ? "Potential origin drift detected (>100m). Check shared coordinates." : undefined,
    elements: generateElements(hash, baseName)
  };
};
