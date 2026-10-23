import {api, setApiSession} from '../src/api/client';

afterEach(() => {jest.restoreAllMocks(); setApiSession({});});

it('scopes team attendance reads and both decisions to the selected company', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '[]'} as Response);
  setApiSession({token: 'test-token', companyId: 1});
  await api.teamAttendance(65, '2026-10-01', '2026-10-23');
  await api.teamRegularisations(65);
  await api.decideTeamRegularisation(7, 'approve', 65);
  await api.decideTeamRegularisation(7, 'reject', 65, 'Incorrect time');
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/team\/attendance\?from=2026-10-01&to=2026-10-23$/);
  expect(fetchMock.mock.calls[1][0]).toMatch(/\/team\/regularisation$/);
  expect(fetchMock.mock.calls[2][0]).toMatch(/\/team\/regularisation\/7\/approve$/);
  expect(fetchMock.mock.calls[3][0]).toMatch(/\/team\/regularisation\/7\/reject$/);
  for (const [, options] of fetchMock.mock.calls) {
    expect(options?.headers).toMatchObject({'X-Company-Id': '65', 'X-Filter-Company-Id': '65'});
  }
  expect(JSON.parse(String(fetchMock.mock.calls[3][1]?.body))).toEqual({remarks: 'Incorrect time'});
});
