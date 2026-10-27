import {api, setApiSession} from '../src/api/client';
import {leaveAttachmentCompany, leaveAttachmentItems, leaveAttachmentUrl, safeLeaveFileName, loadLeaveAttachmentMetadata} from '../src/utils/leaveAttachments';

afterEach(() => {jest.restoreAllMocks(); setApiSession({});});
it('loads leave documents with the request company rather than the login company', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '[]'} as Response);
  setApiSession({token: 'test-token', companyId: 1});
  await api.leaveRequestFiles(17, 64);
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/leave\/requests\/17\/files$/);
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({Authorization: 'Bearer test-token', 'X-Company-Id': '64', 'X-Filter-Company-Id': '64'});
});
it('lists only attached files belonging to the request and never displays server paths', () => {
  expect(leaveAttachmentItems([{id: 1, fileName: 'certificate.pdf', leaveRequest: {id: 17}},
    {id: 2, fileName: 'another.pdf', leaveRequestId: 99}, {fileName: 'no-id.pdf'},
    {id: 3, filePath: '/private/storage/secret.jpg'}], 17)).toEqual([
    {id: 1, fileName: 'certificate.pdf'}, {id: 3, fileName: 'attachment'},
  ]);
  expect(leaveAttachmentItems([], 17)).toEqual([]);
  expect(leaveAttachmentItems({content: [{id: 4, fileName: 'scan.jpg'}]}, 17)).toEqual([{id: 4, fileName: 'scan.jpg'}]);
});
it('uses protected file-ID endpoints and safe download filenames', () => {
  expect(leaveAttachmentUrl('https://grecha.ai/api/', 17, 4, false)).toBe('https://grecha.ai/api/leave/requests/17/files/4/content?download=false');
  expect(leaveAttachmentUrl('https://grecha.ai/api', 17, 4, true)).toContain('download=true');
  expect(safeLeaveFileName('../../scan\r\n.jpg')).toBe('scan__.jpg');
  expect(safeLeaveFileName('C:\\private\\certificate.pdf')).toBe('certificate.pdf');
  expect(safeLeaveFileName('...')).toBe('attachment');
});
it('prefers the leave company and rejects All Companies as a download scope', () => {
  expect(leaveAttachmentCompany({companyId: 64}, 1)).toBe(64);
  expect(leaveAttachmentCompany({employee: {company: {id: 64}}}, 1)).toBe(64);
  expect(leaveAttachmentCompany({}, 'all')).toBeNull();
  expect(leaveAttachmentCompany({}, 1)).toBe(1);
});
it('limits concurrent metadata calls and skips a queued card after it is unmounted', async () => {
  let active = 0;
  let peak = 0;
  const resolvers: Array<() => void> = [];
  const load = jest.fn(() => new Promise<any[]>(resolve => {
    active += 1; peak = Math.max(peak, active);
    resolvers.push(() => {active -= 1; resolve([]);});
  }));
  const tasks = Array.from({length: 4}, () => loadLeaveAttachmentMetadata(load));
  tasks.push(loadLeaveAttachmentMetadata(load, () => false));
  expect(load).toHaveBeenCalledTimes(4);
  resolvers.forEach(resolve => resolve());
  await Promise.all(tasks);
  expect(peak).toBe(4);
  expect(load).toHaveBeenCalledTimes(4);
});
