import {allocationItems} from './leaveAllocations';

export const SUBSCRIPTION_PAGES = ['Subscription Details', 'Plan Limits', 'Billing Scope'];

export type CompanySubscription = {
  company: any;
  organization: any | null;
  limits: any | null;
  error: string;
};

type SubscriptionSource = {
  organizations: () => Promise<any>;
  employees: (companyId: number | string, page: number, size: number) => Promise<any>;
  limits: (organizationId: number | string, companyId: number | string) => Promise<any>;
};

function organizationFor(identity: any, organizations: any[]) {
  const id = identity?.organizationId ?? identity?.organization?.id;
  if (id != null) return organizations.find(org => String(org.id) === String(id));
  const name = identity?.organizationName ?? identity?.organization?.name;
  if (!name) return undefined;
  const matches = organizations.filter(org => org.name === name);
  return matches.length === 1 ? matches[0] : undefined;
}

export async function loadCompanySubscriptions(companies: any[], selectedCompanyId: number | string, source: SubscriptionSource): Promise<CompanySubscription[]> {
  const selected = companies.filter(company => selectedCompanyId === 'all' || String(company.id) === String(selectedCompanyId));
  if (!selected.length) return [];
  const organizations = allocationItems(await source.organizations());
  const identities = new Map<string, any>();
  const usage = new Map<string, {limits: any; error: string}>();
  const records: CompanySubscription[] = [];

  for (const company of selected) {
    let organization = organizationFor(company, organizations);
    let error = '';
    const parent = companies.find(item => String(item.id) === String(company.parentCompanyId));
    if (!organization && parent) organization = organizationFor(parent, organizations);
    if (!organization) {
      try {
        // Older company responses omit the organization link. Employee DTOs
        // expose its exact name; never infer a subscription from the company ID.
        for (const candidate of [company, parent].filter(Boolean)) {
          const key = String(candidate.id);
          if (!identities.has(key)) {
            const employees = allocationItems(await source.employees(candidate.id, 0, 1));
            identities.set(key, employees.find(employee => String(employee.companyId ?? employee.company?.id) === key));
          }
          organization = organizationFor(identities.get(key), organizations);
          if (organization) break;
        }
      } catch (err: any) {
        error = err?.message || 'Unable to load the company subscription.';
      }
    }

    let limits = null;
    if (organization) {
      const key = String(organization.id);
      if (!usage.has(key)) {
        try {
          const result = await source.limits(organization.id, company.id);
          if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Plan limits were not returned.');
          usage.set(key, {limits: result, error: ''});
        } catch (err: any) {
          usage.set(key, {limits: null, error: err?.message || 'Unable to load plan usage.'});
        }
      }
      const result = usage.get(key)!;
      limits = result.limits;
      error = result.error;
    } else if (!error) {
      error = 'No organization subscription link was returned for this company.';
    }
    records.push({company, organization: organization || null, limits, error});
  }
  return records;
}

export function subscriptionLimit(value: any) {
  if (value === null) return 'Unlimited';
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 'Not provided';
  return String(value);
}

export function subscriptionUsage(current: any, limit: any) {
  return `${subscriptionLimit(current === null ? undefined : current)} / ${subscriptionLimit(limit)}`;
}
