import {PermissionsAndroid, Platform} from 'react-native';
import BlobUtil from 'react-native-blob-util';
import {API_BASE_URL, apiAuthHeaders} from '../api/client';
import {LeaveAttachment, leaveAttachmentUrl, safeLeaveFileName} from '../utils/leaveAttachments';

const cacheDir = () => `${BlobUtil.fs.dirs.CacheDir}/hrms-leave-documents`;
export async function clearLeaveAttachmentCache() {
  const dir = cacheDir();
  if (await BlobUtil.fs.exists(dir)) await BlobUtil.fs.unlink(dir);
}

export async function transferLeaveAttachment(requestId: number | string, file: LeaveAttachment,
  companyId: number | string, download: boolean, isCurrent: () => boolean = () => true) {
  const headers = apiAuthHeaders({'X-Company-Id': String(companyId), 'X-Filter-Company-Id': String(companyId)});
  if (!headers.Authorization) throw new Error('Please sign in again to access this document.');
  const dir = cacheDir();
  if (!await BlobUtil.fs.exists(dir)) await BlobUtil.fs.mkdir(dir);
  const name = safeLeaveFileName(file.fileName);
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${name}`;
  const path = `${dir}/${uniqueName}`;
  let keepPreview = false;
  try {
    const response = await BlobUtil.config({path, fileCache: true, timeout: 30000}).fetch('GET',
      leaveAttachmentUrl(API_BASE_URL, requestId, file.id, download), headers);
    const info = response.info();
    if (info.status === 404) throw new Error('This file is no longer available. Please ask the employee to attach it again.');
    if (info.status === 401 || info.status === 403) throw new Error('You do not have access to this leave document. Please refresh or sign in again.');
    if (info.status < 200 || info.status >= 300) throw new Error('Unable to retrieve the document. Please try again.');
    if (!isCurrent() || apiAuthHeaders().Authorization !== headers.Authorization) return;
    const mimeHeader = Object.entries(info.headers || {}).find(([key]) => key.toLowerCase() === 'content-type')?.[1];
    const mime = String(mimeHeader || 'application/octet-stream').split(';')[0].trim().toLowerCase();
    if (mime.includes('json') || mime === 'text/html') throw new Error('The server did not return a document. Please try again.');
    if (download) {
      if (Platform.OS === 'android') {
        if (Number(Platform.Version) >= 29) {
          await BlobUtil.MediaCollection.copyToMediaStore({name: uniqueName, parentFolder: 'HRMS', mimeType: mime}, 'Download', path);
        } else {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Storage permission is needed to save this document in Downloads.');
          if (!isCurrent() || apiAuthHeaders().Authorization !== headers.Authorization) return;
          await BlobUtil.fs.cp(path, `${BlobUtil.fs.dirs.DownloadDir}/${uniqueName}`);
        }
        return 'Document saved to Downloads/HRMS (or Downloads on older Android devices).';
      }
      await BlobUtil.ios.openDocument(path);
      return 'Use Save to Files in the share sheet to keep a copy.';
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mime)) throw new Error('Preview is not available for this file type. Use Download instead.');
    if (Platform.OS === 'ios') BlobUtil.ios.previewDocument(path);
    else await BlobUtil.android.actionViewIntent(path, mime);
    keepPreview = true;
    // Give the external viewer time to read the URI, then remove the private copy.
    setTimeout(() => {BlobUtil.fs.unlink(path).catch(() => {});}, 5 * 60 * 1000);
  } finally {
    if (!keepPreview) await BlobUtil.fs.unlink(path).catch(() => {});
  }
}
