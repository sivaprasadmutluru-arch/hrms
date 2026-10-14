import type {ReactNode} from 'react';
import {allocationItems} from './leaveAllocations';

export const LOAN_TYPES = [{value: 'LOAN', label: 'Loan'}, {value: 'ADVANCED_SALARY', label: 'Advanced Salary'}, {value: 'FINE', label: 'Fine'}];
export type LoanFormValues = {title: string; employeeId: string; loanType: string; loanAmount: string; providedDate: string; installmentAmount: string; installments: string; installmentStartDate: string; description: string};
export type RenderLoanDateField = (label: string, value: string, onChange: (value: string) => void) => ReactNode;

export function canCreateCompanyLoan(roles: string[]) {
  return roles.some(role => ['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER'].includes(role));
}

export function companyLoans(result: any, company: {id: number | string; name: string}) {
  return allocationItems(result).filter(item => {
    const id = item.companyId ?? item.company?.id ?? item.employee?.companyId ?? item.employee?.company?.id;
    return id == null || String(id) === String(company.id);
  }).map(item => ({...item, companyId: company.id, companyName: company.name,
    employeeName: item.employeeName || item.employee?.fullName || [item.employee?.firstName, item.employee?.lastName].filter(Boolean).join(' ').trim() || 'Employee not provided',
  }));
}

function amount(value: string, label: string, optional = false) {
  const text = value.trim();
  if (optional && !text) return null;
  const numeric = Number(text);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text) || !Number.isFinite(numeric) || numeric <= 0 || numeric > 9999999999.99) throw new Error(`${label} must be greater than zero with at most 2 decimal places.`);
  return numeric;
}

function date(value: string, label: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`Select a valid ${label.toLowerCase()}.`);
  return value;
}

export function companyLoanPayload(companyId: number | string, values: LoanFormValues, employees: any[]) {
  const id = Number(companyId);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Select a company before creating a loan.');
  const employeeId = Number(values.employeeId);
  if (!Number.isSafeInteger(employeeId) || employeeId <= 0 || !employees.some(employee => String(employee.id) === values.employeeId && String(employee.companyId ?? employee.company?.id) === String(companyId))) throw new Error('Select an employee from this company.');
  const title = values.title.trim();
  if (!title || title.length > 255) throw new Error('Enter a loan title (maximum 255 characters).');
  if (!LOAN_TYPES.some(type => type.value === values.loanType)) throw new Error('Select a valid loan type.');
  const loanAmount = amount(values.loanAmount, 'Loan amount');
  const installmentAmount = amount(values.installmentAmount, 'Installment amount', true);
  let installments: number | null = null;
  if (values.installments.trim()) {
    installments = Number(values.installments);
    if (!/^\d+$/.test(values.installments.trim()) || !Number.isSafeInteger(installments) || installments < 1 || installments > 2147483647) throw new Error('Number of installments must be a positive whole number.');
  }
  const providedDate = date(values.providedDate, 'Provided date');
  const installmentStartDate = date(values.installmentStartDate, 'Installment start date');
  if ((installmentAmount != null || installments != null || installmentStartDate != null) && (installmentAmount == null || installments == null || installmentStartDate == null)) throw new Error('Complete the installment amount, count, and start date, or leave all three empty.');
  if (providedDate && installmentStartDate && installmentStartDate < providedDate) throw new Error('Installment start date cannot be before the provided date.');
  return {title, loanType: values.loanType, employee: {id: employeeId}, company: {id}, loanAmount, providedDate, installmentAmount, installments, installmentStartDate, description: values.description.trim() || null, isFixed: true, rate: 0, applyOn: 'end_of_month'};
}
