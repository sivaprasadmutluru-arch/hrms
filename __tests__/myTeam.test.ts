import {pendingReview, teamRecords, validTeamRange} from '../src/utils/myTeam';
import {api, setApiSession} from '../src/api/client';

afterEach(() => {jest.restoreAllMocks(); setApiSession({});});
it('filters histories by employee, search and pending status', () => {
  const rows = [{employeeId: 1, employeeName: 'Amina', status: 'REQUESTED'}, {employeeId: 2, employeeName: 'Bilal', status: 'PENDING'}, {employeeId: 1, employeeName: 'Amina', status: 'APPROVED'}];
  expect(teamRecords(rows,'1','amina','PENDING')).toEqual([rows[0]]);
  expect(teamRecords(rows,'1','','ALL')).toEqual([rows[0], rows[2]]);
  expect(teamRecords(rows,'','unknown','ALL')).toEqual([]);
});
it('allows valid dates only and does not treat completed requests as reviewable', () => {
  expect(validTeamRange('2026-10-01','2026-10-24')).toBe(true);
  expect(validTeamRange('2026-02-30','2026-03-10')).toBe(false);
  expect(validTeamRange('2026-10-24','2026-10-01')).toBe(false);
  expect(validTeamRange('2024-01-01','2026-01-01')).toBe(false);
  expect(pendingReview({status:'PENDING',canReview:true})).toBe(true);
  expect(pendingReview({status:'REQUESTED',canReview:false})).toBe(false);
  expect(pendingReview({status:'APPROVED',canReview:true})).toBe(false);
});
it('scopes roster, history and decisions to the current company', async () => {
  const fetchMock = jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,text:async () => '[]'} as Response);
  setApiSession({token:'test',companyId:65});
  await api.teamEmployees(64); await api.teamLeaves(64);
  await api.decideTeamLeave(7,'approve',64);
  await api.decideTeamLeave(8,'reject',64,'Not eligible');
  expect(fetchMock.mock.calls.map(([url]) => String(url).split('/api')[1])).toEqual(['/team/employees','/team/leaves','/team/leaves/7/approve','/team/leaves/8/reject']);
  for (const [,options] of fetchMock.mock.calls) expect(options?.headers).toMatchObject({'X-Company-Id':'64','X-Filter-Company-Id':'64'});
  expect(JSON.parse(String(fetchMock.mock.calls[3][1]?.body))).toEqual({reason:'Not eligible'});
});
