export type LeaveAttachment = {id: number | string; fileName: string};

// Lists can contain many cards. Bound metadata calls so opening the admin
// screen cannot flood the API with a request for every card at once.
let running = 0;
const waiting: Array<() => void> = [];
export async function loadLeaveAttachmentMetadata(load: () => Promise<any>, isCurrent: () => boolean = () => true) {
  if (running >= 4) await new Promise<void>(resolve => waiting.push(resolve));
  else running += 1;
  try {return isCurrent() ? await load() : [];}
  finally {
    const next = waiting.shift();
    if (next) next();
    else running -= 1;
  }
}

export function leaveAttachmentItems(result: any, requestId: number | string): LeaveAttachment[] {
  const items = Array.isArray(result) ? result : Array.isArray(result?.content) ? result.content : [];
  return items.filter((item: any) => item?.id != null
    && (item.leaveRequestId == null || String(item.leaveRequestId) === String(requestId))
    && (item.leaveRequest?.id == null || String(item.leaveRequest.id) === String(requestId)))
    .map((item: any) => ({id: item.id, fileName: safeLeaveFileName(item.fileName || 'attachment')}));
}

export function safeLeaveFileName(name: string): string {
  const basename = String(name).replace(/\\/g, '/').split('/').pop() || 'attachment';
  return basename.replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/^\.+/, '').slice(0, 160) || 'attachment';
}

export function leaveAttachmentUrl(base: string, requestId: number | string, fileId: number | string, download: boolean): string {
  return `${base.replace(/\/$/, '')}/leave/requests/${encodeURIComponent(String(requestId))}/files/${encodeURIComponent(String(fileId))}/content?download=${download}`;
}

export function leaveAttachmentCompany(item: any, fallback?: number | string | null): number | string | null {
  const id = item?.companyId ?? item?.company?.id ?? item?.employee?.companyId ?? item?.employee?.company?.id ?? fallback;
  return id != null && id !== '' && id !== 'all' ? id : null;
}
