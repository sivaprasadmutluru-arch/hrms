import {api, setApiSession} from '../src/api/client';
import {canCreateCompanyLoan, companyLoanPayload, companyLoans, LoanFormValues} from '../src/utils/companyLoans';

const values: LoanFormValues = {title: ' Staff loan ', employeeId: '7', loanType: 'LOAN', loanAmount: '1000.50', providedDate: '2026-10-14', installmentAmount: '100.05', installments: '10', installmentStartDate: '2026-11-01', description: ' Requested by employee '};
const employees = [{id: 7, companyId: 2}];
afterEach(() => {jest.restoreAllMocks(); setApiSession({});});

it('lists and creates loans using the selected company without changing the login session', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '[]'} as Response);
  setApiSession({token: 'test-token', companyId: 1});
  await api.companyLoans(2);
  const payload = companyLoanPayload(2, values, employees);
  await api.createCompanyLoan(payload, 2);
  await api.myCompanyInfo();
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/payroll\/loans$/);
  expect(fetchMock.mock.calls[1][1]).toMatchObject({method: 'POST'});
  expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual(payload);
  fetchMock.mock.calls.slice(0, 2).forEach(([, options]) => expect(options?.headers).toMatchObject({'X-Company-Id': '2', 'X-Filter-Company-Id': '2'}));
  expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({'X-Company-Id': '1'});
});

it('maps real loan accounts to employee names and removes other-company records', () => {
  expect(companyLoans([{id: 1, company: {id: 2}, employee: {firstName: 'Prem', lastName: 'Mulani'}, paidInstallments: 0}, {id: 2, company: {id: 3}}, {id: 3, employee: {companyId: 3}}], {id: 2, name: 'Pioneer'}))
    .toEqual([expect.objectContaining({id: 1, employeeName: 'Prem Mulani', companyId: 2, companyName: 'Pioneer', paidInstallments: 0})]);
});

it('builds the loan account contract with exact selected-company and employee references', () => {
  expect(companyLoanPayload(2, values, employees)).toEqual({title: 'Staff loan', loanType: 'LOAN', employee: {id: 7}, company: {id: 2}, loanAmount: 1000.5, providedDate: '2026-10-14', installmentAmount: 100.05, installments: 10, installmentStartDate: '2026-11-01', description: 'Requested by employee', isFixed: true, rate: 0, applyOn: 'end_of_month'});
});

it('rejects wrong-company employees, invalid amounts, unsupported types and incomplete schedules', () => {
  expect(() => companyLoanPayload('all', values, employees)).toThrow('Select a company');
  expect(() => companyLoanPayload(2, values, [{id: 7, companyId: 3}])).toThrow('employee from this company');
  expect(() => companyLoanPayload(2, {...values, title: ' '}, employees)).toThrow('loan title');
  expect(() => companyLoanPayload(2, {...values, loanType: 'OTHER'}, employees)).toThrow('valid loan type');
  for (const loanAmount of ['0', '-1', 'NaN', '100.001', '10000000000']) expect(() => companyLoanPayload(2, {...values, loanAmount}, employees)).toThrow('Loan amount');
  expect(() => companyLoanPayload(2, {...values, installments: '2.5'}, employees)).toThrow('positive whole number');
  expect(() => companyLoanPayload(2, {...values, installmentStartDate: ''}, employees)).toThrow('Complete the installment');
  expect(() => companyLoanPayload(2, {...values, providedDate: '2026-02-30'}, employees)).toThrow('valid provided date');
  expect(() => companyLoanPayload(2, {...values, installmentStartDate: '2026-09-01'}, employees)).toThrow('before the provided date');
});

it('allows account creation without optional repayment fields and gates creation by backend roles', () => {
  expect(companyLoanPayload(2, {...values, providedDate: '', installmentAmount: '', installments: '', installmentStartDate: ''}, employees)).toMatchObject({providedDate: null, installmentAmount: null, installments: null, installmentStartDate: null});
  for (const role of ['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']) expect(canCreateCompanyLoan([role])).toBe(true);
  expect(canCreateCompanyLoan(['EMPLOYEE'])).toBe(false);
  expect(canCreateCompanyLoan(['ACCOUNTANT'])).toBe(false);
});
