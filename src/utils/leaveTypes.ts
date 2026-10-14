import {allocationItems} from './leaveAllocations';

export function companyLeaveTypes(result: any, companyId: number | string) {
  return allocationItems(result)
    .filter(item => {
      if (!item || typeof item !== 'object') return false;
      const sourceCompanyId = item.companyId ?? item.company?.id;
      // Organization-wide policies returned by the scoped API apply to this company too.
      return sourceCompanyId == null || String(sourceCompanyId) === String(companyId) || item.isOrganizationWide === true;
    })
    .map(item => ({...item, __companyId: companyId}));
}
