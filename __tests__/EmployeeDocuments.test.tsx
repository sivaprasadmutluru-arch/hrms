import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {api, setApiSession} from '../src/api/client';
import EmployeeDocuments from '../src/components/EmployeeDocuments';

jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('react-native-blob-util', () => ({
  config: jest.fn().mockReturnValue({fetch: jest.fn()}),
  fs: {dirs: {CacheDir: '/cache'}},
  ios: {openDocument: jest.fn().mockResolvedValue(undefined)},
  android: {actionViewIntent: jest.fn().mockResolvedValue(true)},
}));

afterEach(() => {
  jest.restoreAllMocks();
  setApiSession({});
});

it('discards a late document response after switching company or employee', async () => {
  let resolveOld!: (value: any[]) => void;
  const oldRequest = new Promise<any[]>(resolve => {resolveOld = resolve;});
  const documents = jest.spyOn(api, 'employeeDocuments')
    .mockReturnValueOnce(oldRequest)
    .mockResolvedValueOnce([{id: 2, title: 'Current employee document'}]);
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<EmployeeDocuments employeeId={7} companyId={2} />);
  });
  await ReactTestRenderer.act(async () => {
    renderer.update(<EmployeeDocuments employeeId={7} companyId={3} />);
  });
  await ReactTestRenderer.act(async () => {
    resolveOld([{id: 1, title: 'Previous company confidential document'}]);
  });
  expect(documents.mock.calls).toEqual([[7, 2], [7, 3]]);
  const view = JSON.stringify(renderer.toJSON());
  expect(view).toContain('Current employee document');
  expect(view).not.toContain('Previous company confidential document');
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('opens a file using the employee company context and the device document viewer', async () => {
  jest.spyOn(api, 'employeeDocuments').mockResolvedValue([{id: 42, title: 'Passport', filePath: 'pioneer/documents/passport.pdf', employeeId: 7, companyId: 2}]);
  const fetchFile = jest.fn().mockResolvedValue({info: () => ({status: 200}), path: () => '/cache/download.pdf'});
  (ReactNativeBlobUtil.config as jest.Mock).mockReturnValue({fetch: fetchFile});
  setApiSession({token: 'test-token', companyId: 1});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<EmployeeDocuments employeeId={7} companyId={2} />);
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root.findByProps({accessibilityLabel: 'Open Passport'}).props.onPress();
  });
  expect(fetchFile).toHaveBeenCalledWith('GET', expect.stringContaining('/api/files/pioneer/documents/passport.pdf'), expect.objectContaining({Authorization: 'Bearer test-token', 'X-Company-Id': '2', 'X-Filter-Company-Id': '2'}));
  expect(ReactNativeBlobUtil.ios.openDocument).toHaveBeenCalledWith('/cache/download.pdf');
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});
