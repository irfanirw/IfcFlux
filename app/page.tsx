"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  FileUp,
  Info,
  Layers,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  Wrench
} from "lucide-react";
import clsx from "clsx";
import { baselineRulePack } from "@/lib/rule-pack";
import { createModel, hashFile } from "@/lib/mock-ifc";
import { Issue, ModelFile } from "@/lib/types";
import { runValidation } from "@/lib/validation";

type SidebarMode = "objectTree" | "models";
type RightTab = "properties" | "pset" | "validation" | "report";

const severityColor = {
  critical: "text-red-400",
  major: "text-orange-400",
  minor: "text-yellow-300"
};

export default function HomePage() {
  const [models, setModels] = useState<ModelFile[]>([]);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("models");
  const [rightTab, setRightTab] = useState<RightTab>("properties");
  const [selectedModelId, setSelectedModelId] = useState<string>();
  const [selectedExpressId, setSelectedExpressId] = useState<number>();
  const [search, setSearch] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isRunningValidation, setRunningValidation] = useState(false);

  const selectedModel = models.find((item) => item.modelId === selectedModelId) ?? models[0];
  const selectedElement = selectedModel?.elements.find((item) => item.expressId === selectedExpressId) ?? selectedModel?.elements[0];

  useEffect(() => {
    const hasDirty = models.some((item) => item.dirty);
    const listener = (event: BeforeUnloadEvent) => {
      if (!hasDirty) return;
      event.preventDefault();
      event.returnValue = "Unsaved IFC edits detected.";
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [models]);

  useEffect(() => {
    if (!selectedModel && models[0]) setSelectedModelId(models[0].modelId);
  }, [models, selectedModel]);

  const visibleModels = models.filter((item) => item.visible);
  const objectTree = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!selectedModel) return [];
    return selectedModel.elements.filter((item) => {
      if (!term) return true;
      return (
        item.globalId.toLowerCase().includes(term) ||
        item.ifcType.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        item.material.toLowerCase().includes(term)
      );
    });
  }, [selectedModel, search]);

  const uploadIfc = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const created: ModelFile[] = [];
    for (const file of files) {
      const hash = await hashFile(file);
      created.push(createModel(file, hash));
    }
    setModels((prev) => [...prev, ...created]);
    event.target.value = "";
  };

  const runRules = async () => {
    setRunningValidation(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    const result = runValidation(models, baselineRulePack.rules);
    setIssues(result);
    setModels((prev) => prev.map((item) => ({ ...item, lastValidatedAt: new Date().toISOString() })));
    setRightTab("report");
    setRunningValidation(false);
  };

  const updateProperty = (name: string, value: string) => {
    if (!selectedModel || !selectedElement) return;
    setModels((prev) =>
      prev.map((model) => {
        if (model.modelId !== selectedModel.modelId) return model;
        return {
          ...model,
          dirty: true,
          elements: model.elements.map((element) => {
            if (element.expressId !== selectedElement.expressId) return element;
            return {
              ...element,
              properties: element.properties.map((prop) => (prop.name === name ? { ...prop, value } : prop)),
              psets: element.psets.map((pset) => ({
                ...pset,
                properties: pset.properties.map((prop) => (prop.name === name ? { ...prop, value } : prop))
              }))
            };
          })
        };
      })
    );
  };

  const exportModel = (model: ModelFile) => {
    const payload = {
      meta: {
        modelId: model.modelId,
        file: model.originalFileName,
        discipline: model.discipline,
        exportedAt: new Date().toISOString()
      },
      elements: model.elements
    };
    const blob = new Blob([`ISO-10303-21;\n/* IFC+SG MVP export */\n${JSON.stringify(payload, null, 2)}\nEND-ISO-10303-21;`], {
      type: "application/x-step"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = model.originalFileName.replace(/\.ifc$/i, "") + "_edited.ifc";
    a.click();
    URL.revokeObjectURL(url);
    setModels((prev) => prev.map((item) => (item.modelId === model.modelId ? { ...item, dirty: false } : item)));
  };

  const issueCounts = {
    critical: issues.filter((item) => item.severity === "critical").length,
    major: issues.filter((item) => item.severity === "major").length,
    minor: issues.filter((item) => item.severity === "minor").length
  };

  return (
    <main className="grid h-screen grid-rows-[56px_1fr_28px] overflow-hidden bg-[#041125] text-textMain">
      <header className="flex items-center justify-between border-b border-line bg-panel px-5">
        <div className="flex items-center gap-4 text-lg font-semibold">IfcFlux CORENET X</div>
        <div className="flex w-[34rem] items-center rounded-md border border-line bg-panelSoft px-3 py-2 text-sm text-textMuted">
          <Search className="mr-2 h-4 w-4" />
          <input
            className="w-full bg-transparent outline-none"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search GUID/Type/Material..."
          />
        </div>
        <div className="flex items-center gap-4 text-textMuted">
          <Bell className="h-4 w-4" /> <Settings className="h-4 w-4" />
        </div>
      </header>

      <section className="grid grid-cols-[320px_1fr_360px] overflow-hidden">
        <aside className="border-r border-line bg-[#04162e]">
          <div className="grid grid-cols-2 border-b border-line text-xs font-semibold uppercase tracking-wide">
            <button className={clsx("py-3", sidebarMode === "models" && "border-b-2 border-accent text-accent")} onClick={() => setSidebarMode("models")}>Models</button>
            <button className={clsx("py-3", sidebarMode === "objectTree" && "border-b-2 border-accent text-accent")} onClick={() => setSidebarMode("objectTree")}>Object Tree</button>
          </div>
          <div className="panel-scroll h-[calc(100%-120px)] overflow-auto p-4 text-sm">
            {sidebarMode === "models" && (
              <div className="space-y-3">
                {models.map((model) => (
                  <article key={model.modelId} className="rounded-lg border border-line bg-panelSoft p-3">
                    <div className="flex items-center justify-between">
                      <button className="font-medium text-left" onClick={() => setSelectedModelId(model.modelId)}>{model.originalFileName}</button>
                      <button onClick={() => setModels((prev) => prev.map((item) => (item.modelId === model.modelId ? { ...item, visible: !item.visible } : item)))}>
                        {model.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-accent">{model.discipline}</p>
                    {model.alignmentWarning && <p className="mt-2 text-xs text-yellow-300">⚠ {model.alignmentWarning}</p>}
                  </article>
                ))}
                {!models.length && <p className="text-textMuted">Upload IFC files to start federation.</p>}
              </div>
            )}
            {sidebarMode === "objectTree" && (
              <div className="space-y-2">
                {objectTree.map((element) => (
                  <button
                    key={element.globalId}
                    onClick={() => {
                      setSelectedModelId(selectedModel?.modelId);
                      setSelectedExpressId(element.expressId);
                    }}
                    className={clsx(
                      "w-full rounded-md border px-2 py-2 text-left",
                      selectedExpressId === element.expressId ? "border-accent bg-[#0f2948]" : "border-line bg-panelSoft"
                    )}
                  >
                    <p className="font-medium">{element.name}</p>
                    <p className="text-xs text-textMuted">{element.ifcType} · {element.globalId}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <label className="m-4 flex cursor-pointer items-center justify-center gap-2 rounded-md bg-[#1f82e8] px-4 py-3 font-semibold">
            <Upload className="h-4 w-4" /> Upload New IFC
            <input className="hidden" type="file" accept=".ifc" multiple onChange={uploadIfc} />
          </label>
        </aside>

        <section className="relative bg-[linear-gradient(90deg,#081a33,#122544)]">
          <div className="absolute left-5 top-5 rounded border border-line bg-panelSoft p-3 text-xs">
            <p>TRIANGLES: {(visibleModels.length * 380000).toLocaleString()}</p>
            <p>OBJECTS: {visibleModels.reduce((acc, item) => acc + item.elements.length, 0).toLocaleString()}</p>
            <p>FPS: 60.0</p>
          </div>
          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3 rounded-2xl border border-line bg-panel px-5 py-3">
            <Layers className="h-5 w-5" /> <Wrench className="h-5 w-5" /> <FileUp className="h-5 w-5" />
          </div>
          <div className="absolute inset-0 m-20 rounded-2xl border border-line/50" />
        </section>

        <aside className="border-l border-line bg-[#04162e]">
          <div className="grid grid-cols-4 border-b border-line text-xs font-semibold uppercase">
            {(["properties", "pset", "validation", "report"] as RightTab[]).map((tab) => (
              <button key={tab} onClick={() => setRightTab(tab)} className={clsx("py-3", rightTab === tab && "border-b-2 border-accent text-accent")}>{tab}</button>
            ))}
          </div>

          <div className="panel-scroll h-[calc(100%-78px)] overflow-auto p-4 text-sm">
            {rightTab === "properties" && selectedElement && (
              <div>
                <p className="mb-3 flex items-center gap-2 text-base font-semibold"><Info className="h-4 w-4 text-accent" /> Element Info</p>
                <div className="space-y-2">
                  {selectedElement.properties.map((prop) => (
                    <div key={prop.name} className="rounded border border-line bg-panelSoft p-2">
                      <p className="text-xs text-textMuted">{prop.name}</p>
                      {prop.editable ? (
                        <input className="mt-1 w-full rounded border border-line bg-[#091b33] px-2 py-1" value={prop.value} onChange={(event) => updateProperty(prop.name, event.target.value)} />
                      ) : (
                        <p className="mt-1">{prop.value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rightTab === "pset" && selectedElement && (
              <div className="space-y-3">
                {selectedElement.psets.map((pset) => (
                  <div key={pset.name} className="rounded border border-line bg-panelSoft p-3">
                    <p className="font-semibold text-accent">{pset.name}</p>
                    {pset.properties.map((prop) => (
                      <p className="mt-1 text-xs" key={prop.name}>{prop.name}: {prop.value || <span className="text-red-400">(empty)</span>}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {rightTab === "validation" && (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-base font-semibold"><ShieldCheck className="h-4 w-4 text-accent" /> IFC+SG Validation</p>
                <div className="rounded border border-line bg-panelSoft p-3 text-xs">
                  <p>Rule Pack: {baselineRulePack.name}</p>
                  <p>Version: {baselineRulePack.version}</p>
                  <p>Rules: {baselineRulePack.rules.length}</p>
                </div>
                <button disabled={!models.length || isRunningValidation} onClick={runRules} className="w-full rounded bg-[#1f82e8] py-2 font-semibold disabled:opacity-50">
                  {isRunningValidation ? "Running validation..." : "Run Validation"}
                </button>
              </div>
            )}

            {rightTab === "report" && (
              <div>
                <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded border border-red-500/40 bg-red-950/30 p-2">Critical: {issueCounts.critical}</div>
                  <div className="rounded border border-orange-500/40 bg-orange-950/20 p-2">Major: {issueCounts.major}</div>
                  <div className="rounded border border-yellow-500/40 bg-yellow-900/20 p-2">Minor: {issueCounts.minor}</div>
                </div>
                <div className="space-y-2">
                  {issues.map((issue) => (
                    <button
                      key={issue.issueId}
                      className="w-full rounded border border-line bg-panelSoft p-2 text-left"
                      onClick={() => {
                        setSelectedModelId(issue.modelId);
                        setSelectedExpressId(issue.elementRef.expressId);
                        setRightTab("properties");
                      }}
                    >
                      <p className={clsx("text-xs font-semibold uppercase", severityColor[issue.severity])}>{issue.severity}</p>
                      <p className="text-sm">{issue.message}</p>
                      <p className="text-xs text-textMuted">{issue.elementRef.ifcType} #{issue.elementRef.expressId}</p>
                    </button>
                  ))}
                  {!issues.length && <p className="text-textMuted">No report yet. Run validation to generate issues.</p>}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-line p-4">
            <button className="rounded border border-line bg-panel py-2">Edit</button>
            <button
              onClick={() => selectedModel && exportModel(selectedModel)}
              disabled={!selectedModel}
              className="rounded border border-accent bg-[#0b2f57] py-2 disabled:opacity-60"
            >
              Export
            </button>
          </div>
        </aside>
      </section>

      <footer className="flex items-center justify-between border-t border-line bg-panel px-4 text-xs text-textMuted">
        <p className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-400" /> Viewer Ready</p>
        <p>IFC4 Reference View + IFC+SG (MVP)</p>
        <p>{models.some((item) => item.dirty) ? "Unsaved Changes" : "Cache Warm"}</p>
      </footer>
    </main>
  );
}
