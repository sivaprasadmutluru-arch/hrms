import {api, setApiSession} from '../src/api/client';
import {companyDocumentRequests, documentRequestPayload} from '../src/utils/documentRequests';

afterEach(() => {jest.restoreAllMocks(); setApiSession({});});

it('uses the selected company for listing, creation and submission-status requests', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '{"id":42}'} as Response);
  setApiSession({token: 'test-token', companyId: 1});
  await api.adminDocumentRequests(2);
  const data = {title: 'Passport', company: {id: 2}, employees: [{id: 7}], documentFormat: 'PDF'};
  await api.createDocumentRequest(data, 2);
  await api.documentRequestSubmissions(42, 2);
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/documents\/requests$/);
  expect(fetchMock.mock.calls[1][1]).toMatchObject({method: 'POST'});
  expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual(data);
  expect(fetchMock.mock.calls[2][0]).toMatch(/\/documents\/requests\/42\/submissions$/);
  fetchMock.mock.calls.forEach(([, options]) => expect(options?.headers).toMatchObject({'X-Company-Id': '2', 'X-Filter-Company-Id': '2'}));
});

it('builds the backend payload with company and employee references', () => {
  expect(documentRequestPayload(2, {title: ' Passport ', documentFormat: 'PDF', maxSizeMb: '10', description: ' Please update ', employeeIds: ['7', '7']}, [{id: 7, companyId: 2}]))
    .toEqual({title: 'Passport', documentFormat: 'PDF', maxSizeMb: 10, description: 'Please update', company: {id: 2}, employees: [{id: 7}]});
});

it('blocks invalid fields and employee IDs from a different company', () => {
  const values = {title: 'Passport', documentFormat: 'ANY', maxSizeMb: '', description: '', employeeIds: ['7']};
  expect(() => documentRequestPayload('all', values, [{id: 7, companyId: 2}])).toThrow('Select a company');
  expect(() => documentRequestPayload(2, {...values, title: '  '}, [{id: 7, companyId: 2}])).toThrow('request title');
  expect(() => documentRequestPayload(2, {...values, documentFormat: 'EXE'}, [{id: 7, companyId: 2}])).toThrow('supported document format');
  for (const size of ['0', '-1', '1.5', 'abc']) {
    expect(() => documentRequestPayload(2, {...values, maxSizeMb: size}, [{id: 7, companyId: 2}])).toThrow('positive whole number');
  }
  expect(() => documentRequestPayload(2, values, [{id: 7, companyId: 3}])).toThrow('this company only');
  expect(documentRequestPayload(2, {...values, employeeIds: []}, [])).toMatchObject({maxSizeMb: null, employees: []});
});

it('excludes another company requests from the list', () => {
  expect(companyDocumentRequests([{id: 1, company: {id: 2}}, {id: 2, companyId: 3}, {id: 3}], {id: 2, name: 'Pioneer'}))
    .toEqual([expect.objectContaining({id: 1, companyId: 2, companyName: 'Pioneer'}), expect.objectContaining({id: 3, companyId: 2})]);
});
