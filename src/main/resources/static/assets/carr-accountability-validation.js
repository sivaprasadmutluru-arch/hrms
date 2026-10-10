export function accountabilityError(kpis) {
 if (!Array.isArray(kpis) || !kpis.length) return 'Add at least one KPI before continuing.';
 for (const [index,kpi] of kpis.entries()) {
  if (!kpi.name?.trim()) return `Enter a KPI name for row ${index+1}.`;
  if (kpi.targetValue === '' || kpi.targetValue == null || !Number.isFinite(Number(kpi.targetValue))) return `Enter a numeric target for KPI ${index+1}.`;
  if (!Number.isInteger(Number(kpi.weight)) || Number(kpi.weight)<1 || Number(kpi.weight)>100) return `Enter a weight from 1 to 100 for KPI ${index+1}.`;
 }
 if (kpis.reduce((sum,kpi)=>sum+Number(kpi.weight),0)!==100) return 'KPI weights must total 100% before continuing.';
 return '';
}
