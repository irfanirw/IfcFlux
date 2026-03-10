import { Issue, ModelFile, Rule } from "@/lib/types";

const getPsetValue = (model: ModelFile, expressId: number, psetName: string, propName: string) => {
  const element = model.elements.find((item) => item.expressId === expressId);
  const pset = element?.psets.find((item) => item.name === psetName);
  return pset?.properties.find((prop) => prop.name === propName)?.value;
};

const matches = (rule: Rule, value?: string) => {
  if (rule.checkType === "presence") return value !== undefined;
  if (rule.checkType === "nonEmpty") return !!value?.trim();
  if (rule.checkType === "allowedValues") return !!value && !!rule.allowedValues?.includes(value);
  if (rule.checkType === "regex") return !!value && !!rule.regex && new RegExp(rule.regex).test(value);
  return true;
};

export const runValidation = (models: ModelFile[], rules: Rule[]): Issue[] => {
  const issues: Issue[] = [];
  for (const model of models) {
    for (const element of model.elements) {
      for (const rule of rules) {
        if (!rule.selector.ifcTypes.includes(element.ifcType)) continue;
        const value =
          rule.psetName === "Identity"
            ? element.properties.find((item) => item.name === rule.propertyName)?.value
            : getPsetValue(model, element.expressId, rule.psetName, rule.propertyName);
        if (matches(rule, value)) continue;
        issues.push({
          issueId: `${rule.ruleId}-${model.modelId}-${element.expressId}`,
          modelId: model.modelId,
          severity: rule.severity,
          ruleId: rule.ruleId,
          message: rule.messageTemplate,
          elementRef: {
            globalId: element.globalId,
            expressId: element.expressId,
            ifcType: element.ifcType
          }
        });
      }
    }
  }
  return issues;
};
