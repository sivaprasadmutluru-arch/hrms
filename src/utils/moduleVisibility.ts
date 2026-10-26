export type ModuleVisibility = Record<string, boolean> | null;
const moduleKeys: Record<string, string> = {
  payslips: 'payslips', Payroll: 'payslips', 'Manual Payroll': 'payslips',
  'Automated Payroll': 'payslips', 'Payslip Import': 'payslips',
  loans: 'loans', Loans: 'loans', 'Loan Requests': 'loans',
  reimbursements: 'reimbursements', Reimbursements: 'reimbursements',
};
export function moduleIsVisible(page: string, visibility: ModuleVisibility): boolean {
  const key = moduleKeys[page];
  // Do not flash company-controlled modules before the settings have loaded.
  return !key || (visibility !== null && visibility[key] !== false);
}
