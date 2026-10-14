import {api, setApiSession} from '../src/api/client';
import {documentFile, documentsForEmployee, loadDocumentEmployees} from '../src/utils/employeeDocuments';

afterEach(() => {
  jest.restoreAllMocks();
  setApiSession({});
});

it('loads employees and a selected employee documents in the employee company context', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '[]'} as Response);
  setApiSession({token: 'test-token', companyId: 1});
  await api.companyEmployees(2, 0, 200);
  await api.employeeDocuments(7, 2);
  await api.me();
  expect(fetchMock.mock.calls[0][0]).toContain('/employees?filterByCompanyId=2');
  expect(fetchMock.mock.calls[1][0]).toMatch(/\/documents\/employee\/7$/);
  for (const call of fetchMock.mock.calls.slice(0, 2)) {
    expect(call[1]?.headers).toMatchObject({'X-Company-Id': '2', 'X-Filter-Company-Id': '2'});
  }
  expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({'X-Company-Id': '1'});
});

it('lists every active company employee even when none have documents', async () => {
  const load = jest.fn()
    .mockResolvedValueOnce({content: [
      {id: 7, fullName: 'Alex', companyId: 2},
      {id: 8, fullName: 'Other employee', companyId: 1},
      {id: 9, fullName: 'Inactive', companyId: 2, isActive: false},
    ], page: {totalPages: 2}})
    .mockResolvedValueOnce({content: [{id: 10, fullName: 'Sam', companyId: '2'}, {id: 7, fullName: 'Alex', companyId: 2}], page: {totalPages: 2}});
  const employees = await loadDocumentEmployees(load, {id: 2, name: 'Pioneer'});
  expect(employees.map(item => item.id)).toEqual([7, 10]);
  expect(employees.every(item => item.companyId === 2 && item.companyName === 'Pioneer')).toBe(true);
  expect(load.mock.calls).toEqual([[2, 0, 200], [2, 1, 200]]);
});

it('keeps only the selected employee documents and excludes other-company IDs', () => {
  const documents = documentsForEmployee({content: [
    {id: 1, employee: {id: 7, company: {id: 2}}},
    {id: 2, employeeId: 8, companyId: 2},
    {id: 3, employeeId: 7, companyId: 1},
    {id: 4, employeeId: '7', companyId: '2'},
    {id: 5, title: 'Scoped response without employee fields'},
  ]}, 7, 2);
  expect(documents.map(item => item.id)).toEqual([1, 4, 5]);
  expect(documentsForEmployee([], 7, 2)).toEqual([]);
});

it('resolves stored file paths into authenticated API URLs with the correct file type', () => {
  expect(documentFile({filePath: 'pioneer/documents/Passport Scan.pdf'}, 'https://grecha.ai/api')).toMatchObject({
    url: 'https://grecha.ai/api/files/pioneer/documents/Passport%20Scan.pdf', authenticated: true, mime: 'application/pdf',
  });
  expect(documentFile({filePath: '/api/files/pioneer/documents/photo.jpg'}, 'https://grecha.ai/api')).toMatchObject({
    url: 'https://grecha.ai/api/files/pioneer/documents/photo.jpg', mime: 'image/jpeg',
  });
  expect(documentFile({title: 'Requested passport'}, 'https://grecha.ai/api')).toBeNull();
});

it('does not attach session credentials to external file URLs', () => {
  expect(documentFile({fileUrl: 'https://storage.example.com/file.pdf?signature=example'}, 'https://grecha.ai/api'))
    .toMatchObject({authenticated: false, mime: 'application/pdf'});
  expect(documentFile({fileUrl: 'https://grecha.ai.evil.example/file.pdf'}, 'https://grecha.ai/api'))
    .toMatchObject({authenticated: false});
  expect(() => documentFile({filePath: '../passport.pdf'}, 'https://grecha.ai/api')).toThrow('Invalid document file path');
});
