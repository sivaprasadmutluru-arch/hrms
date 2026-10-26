import {moduleIsVisible} from '../src/utils/moduleVisibility';
import {api, setApiSession} from '../src/api/client';

afterEach(() => {jest.restoreAllMocks(); setApiSession({});});
it('hides all controlled shortcuts and admin pages when disabled', () => {
  const disabled = {payslips: false, loans: false, reimbursements: false};
  for (const page of ['payslips', 'Payroll', 'Manual Payroll', 'Automated Payroll', 'Payslip Import', 'loans', 'Loans', 'Loan Requests', 'Reimbursements']) {
    expect(moduleIsVisible(page, disabled)).toBe(false);
  }
  expect(moduleIsVisible('Leave Requests', disabled)).toBe(true);
  expect(moduleIsVisible('Contracts', disabled)).toBe(true);
});
it('waits for company settings without hiding unrelated modules', () => {
  expect(moduleIsVisible('Loans', null)).toBe(false);
  expect(moduleIsVisible('payslips', null)).toBe(false);
  expect(moduleIsVisible('Attendance', null)).toBe(true);
  expect(moduleIsVisible('Loans', {})).toBe(true);
  expect(moduleIsVisible('payslips', {payslips: true})).toBe(true);
});
it('scopes visibility queries and headers to the selected company', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '{"loans":false}'} as Response);
  setApiSession({token: 'test', companyId: 1});
  await expect(api.moduleVisibility(64)).resolves.toEqual({loans: false});
  const [url, options] = fetchMock.mock.calls[0];
  expect(String(url)).toContain('companyId=64');
  expect(options?.headers).toMatchObject({'X-Company-Id': '64', 'X-Filter-Company-Id': '64'});
});
