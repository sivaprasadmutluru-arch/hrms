import {PermissionsAndroid, Platform} from 'react-native';
import BlobUtil from 'react-native-blob-util';
import {setApiSession} from '../src/api/client';
import {clearLeaveAttachmentCache, transferLeaveAttachment} from '../src/native/LeaveAttachmentFiles';

jest.mock('react-native-blob-util', () => ({__esModule: true, default: {
  config: jest.fn(),
  fs: {dirs: {CacheDir: '/private/cache', DownloadDir: '/Downloads'}, exists: jest.fn(), mkdir: jest.fn(), unlink: jest.fn(), cp: jest.fn()},
  MediaCollection: {copyToMediaStore: jest.fn()}, android: {actionViewIntent: jest.fn()},
  ios: {openDocument: jest.fn(), previewDocument: jest.fn()},
}}));
const file = {id: 4, fileName: 'certificate.pdf'};
const fetchFile = jest.fn();
const response = (status = 200, mime = 'application/pdf') => ({info: () => ({status, headers: {'Content-Type': mime}})});
const os = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
const version = Object.getOwnPropertyDescriptor(Platform, 'Version')!;
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'android'});
  Object.defineProperty(Platform, 'Version', {configurable: true, value: 29});
  setApiSession({token: 'test-token', companyId: 1});
  (BlobUtil.config as jest.Mock).mockReturnValue({fetch: fetchFile});
  fetchFile.mockResolvedValue(response());
  (BlobUtil.fs.exists as jest.Mock).mockResolvedValue(true);
  (BlobUtil.fs.unlink as jest.Mock).mockResolvedValue(undefined);
  (BlobUtil.fs.cp as jest.Mock).mockResolvedValue(undefined);
  (BlobUtil.android.actionViewIntent as jest.Mock).mockResolvedValue(undefined);
  (BlobUtil.ios.openDocument as jest.Mock).mockResolvedValue(undefined);
  (BlobUtil.MediaCollection.copyToMediaStore as jest.Mock).mockResolvedValue('content://downloads/4');
});
afterEach(() => {
  jest.runOnlyPendingTimers(); jest.useRealTimers(); jest.restoreAllMocks(); setApiSession({});
  Object.defineProperty(Platform, 'OS', os); Object.defineProperty(Platform, 'Version', version);
});
it('views a protected PDF in the external viewer using the leave company', async () => {
  await transferLeaveAttachment(17, file, 64, false);
  expect(fetchFile).toHaveBeenCalledWith('GET', expect.stringContaining('/leave/requests/17/files/4/content?download=false'),
    expect.objectContaining({Authorization: 'Bearer test-token', 'X-Company-Id': '64', 'X-Filter-Company-Id': '64'}));
  expect(BlobUtil.android.actionViewIntent).toHaveBeenCalledWith(expect.stringContaining('/private/cache/hrms-leave-documents/'), 'application/pdf');
  expect(BlobUtil.MediaCollection.copyToMediaStore).not.toHaveBeenCalled();
});
it('saves downloads through MediaStore on Android 10 without broad storage permission', async () => {
  const permission = jest.spyOn(PermissionsAndroid, 'request');
  expect(await transferLeaveAttachment(17, file, 64, true)).toContain('Downloads');
  expect(BlobUtil.MediaCollection.copyToMediaStore).toHaveBeenCalledWith(expect.objectContaining({name: expect.stringContaining('certificate.pdf'), parentFolder: 'HRMS', mimeType: 'application/pdf'}), 'Download', expect.any(String));
  expect(permission).not.toHaveBeenCalled();
  expect(BlobUtil.fs.unlink).toHaveBeenCalled();
});
it.each([401, 403, 404, 500])('does not view or save an HTTP %s error response', async status => {
  fetchFile.mockResolvedValue(response(status));
  await expect(transferLeaveAttachment(17, file, 64, true)).rejects.toThrow();
  expect(BlobUtil.android.actionViewIntent).not.toHaveBeenCalled();
  expect(BlobUtil.MediaCollection.copyToMediaStore).not.toHaveBeenCalled();
  expect(BlobUtil.fs.unlink).toHaveBeenCalled();
});
it('cancels a completed transfer if the user signed out or changed accounts', async () => {
  fetchFile.mockImplementationOnce(async () => {setApiSession({token: 'another-token', companyId: 64}); return response();});
  await transferLeaveAttachment(17, file, 64, true);
  expect(BlobUtil.MediaCollection.copyToMediaStore).not.toHaveBeenCalled();
});
it('does not open a stale request after its screen is unmounted', async () => {
  await transferLeaveAttachment(17, file, 64, false, () => false);
  expect(BlobUtil.android.actionViewIntent).not.toHaveBeenCalled();
});
it('does not render HTML or unknown types as a certificate preview', async () => {
  fetchFile.mockResolvedValueOnce(response(200, 'text/html'));
  await expect(transferLeaveAttachment(17, file, 64, false)).rejects.toThrow('did not return a document');
  fetchFile.mockResolvedValueOnce(response(200, 'application/octet-stream'));
  await expect(transferLeaveAttachment(17, file, 64, false)).rejects.toThrow('Use Download');
  expect(BlobUtil.android.actionViewIntent).not.toHaveBeenCalled();
});
it('opens the iOS export sheet for Save to Files', async () => {
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'ios'});
  expect(await transferLeaveAttachment(17, file, 64, true)).toContain('Save to Files');
  expect(BlobUtil.ios.openDocument).toHaveBeenCalled();
  expect(BlobUtil.MediaCollection.copyToMediaStore).not.toHaveBeenCalled();
});
it('requests legacy storage permission only on Android below 10', async () => {
  Object.defineProperty(Platform, 'Version', {configurable: true, value: 28});
  jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
  await expect(transferLeaveAttachment(17, file, 64, true)).rejects.toThrow('Storage permission');
  expect(BlobUtil.fs.cp).not.toHaveBeenCalled();
});
it('clears only the leave preview cache on sign out', async () => {
  await clearLeaveAttachmentCache();
  expect(BlobUtil.fs.unlink).toHaveBeenCalledWith('/private/cache/hrms-leave-documents');
});
