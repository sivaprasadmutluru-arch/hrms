# Leave actions and certificate viewing — 27 October 2026

Production activated at 13:27 IST; startup completed at 13:28 IST.

- Release: `/opt/cloudhrms/releases/cloudhrms-20261027-leave-actions.jar`
- Live JAR SHA256: `1e4dfbdba2524b8d7afb4dc6fa4a26ed6e0f8fd936737adcacd5e1f3720b6496`
- Rollback: `/opt/cloudhrms/backups/cloudhrms-before-20261027-leave-actions.jar`
- Previous SHA256: `cd09709428ea8f127420640b6876076e95ae32180bf5254a7e8850e335c44bbc`
- Service `cloudhrms`, PID after activation: `94560`.
- Web entry: `/assets/index-DOUTdb_x.js`; leave page: `/assets/LeavePage--dNx4eLh.js`.

## Scope

Sticky leading `+` menu on leave-request rows, preserving existing permission/status rules, plus image/PDF attachment preview and download using authenticated request/file IDs. Existing assets remain in the JAR for open browser sessions.

The release was constructed from the downloaded production JAR, adding only `LeaveAttachmentController`, `LeaveAttachmentService`, and its `Attachment` record as backend classes. All previously deployed backend classes and migrations were preserved byte-for-byte. The separate local change adding `requireRead` to the metadata-list method of `LeaveController` was **not** included; metadata still uses its existing production authorization. The new file-content endpoint enforces company/filter/owner/reviewer access. Legacy public media exposure was not audited or changed by this release.

The web build used `hrms-web/vite.leave-release.config.js` to exclude the in-progress attendance-policy controls. The broader attendance-exemption backend/mobile feature is not deployed. No database migration or employee-data update was performed.

## Verification

- Four menu permission/status tests passed.
- Eight attachment authorization/path/header tests passed.
- Release web production build passed.
- Backend additions compiled against actual production dependencies.
- Uploaded JAR checksum verified before activation; baseline checksum checked before replacement.
- Service active, successful Spring startup; local homepage HTTP 200.
- Unauthenticated attachment-content request HTTP 401.
- Public `https://grecha.ai/` HTTP 200 with the new web entry.
- Public entry and leave-page JavaScript bytes matched the local release build.
- Authenticated browser workflows and a real uploaded certificate were not manually exercised.

No Git push was performed as part of this deployment.
