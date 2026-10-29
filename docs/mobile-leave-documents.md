# Mobile leave document access

The shared mobile `LeaveAttachments` control appears on employee leave history, admin leave cards/details, My Team records, and admin/team decision dialogs. The document icon/count is shown only for attached files; View and Download are available for each filename. Empty lists have no document icon, and metadata failures offer Retry.

Metadata uses `/api/leave/requests/{requestId}/files`; content uses the already-deployed authenticated `/api/leave/requests/{requestId}/files/{fileId}/content` endpoint. Both calls carry the bearer token and request-company/filter headers. No raw storage path or arbitrary public file URL is used. Company/account/request changes invalidate old responses. Metadata calls are capped at four concurrent requests.

PDF/JPEG/PNG previews use the installed viewer. Android 10+ saves in Downloads/HRMS through MediaStore; older Android requests legacy storage permission (manifest capped at API 28). iOS provides the export sheet for Save to Files. Preview copies are removed after five minutes and on sign-out; user-requested Downloads/Files copies remain. Download errors and unavailable files are explained to the user.

Mobile source: `C:/Users/sivap/Desktop/hrms`. TypeScript, focused lint and 31 regression tests cover document indicators/actions, metadata scoping, stale context, protected downloads, Android 10 storage, iOS export, permission errors, manager actions and attendance behaviour. Native device features were mocked, not physically exercised.

No new dependencies, SDK/ABI changes, APK/AAB build, Git push, or store release were performed. Rebuild/distribute the app for employees to receive this UI.
