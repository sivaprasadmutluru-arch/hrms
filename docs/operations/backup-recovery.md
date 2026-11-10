# Backup and recovery

The Backup & recovery page now creates encrypted platform-wide backups. It is restricted to Platform Super Admins. Customer administrators and delegated Operations/Support/Billing staff cannot configure, run, download or verify these backups. Legacy configuration-only endpoints have been replaced; old settings are not automatically activated.

## Deployment

Apply backend migration V48. Configure the following server properties (environment variables can also use Spring relaxed binding):

```
backup.directory=/private-backup-volume/accruehr
backup.encryption-key-file=/separate-secret-volume/accruehr-backup.key
backup.pg-dump=/usr/bin/pg_dump
backup.pg-restore=/usr/bin/pg_restore
backup.timeout-seconds=1800
```

Use PostgreSQL client tools compatible with the server version. Database connection details come from the configured application datasource; passwords are passed through the subprocess environment, not command arguments. Local development uses private Docker wrapper scripts in backend `.runtime/`, loaded through `.runtime/backup.properties`. They are local configuration, not portable production executable paths.

The 32-byte encryption key is created on the first backup with owner-only permissions. Keep a separate secure copy of this key. It is never included in an archive and losing it makes archives unrecoverable. Backup storage and key paths must be separate from uploaded-media storage. The backend account must own the private directories. The current archive format is AccrueHR version 2: bounded 64 KiB authenticated AES-256-GCM frames, with an authenticated end frame and SHA-256 file checksums in a versioned manifest.

Full database backups contain all organization schemas and public shared identity/configuration tables. Media backups contain uploaded files. A PostgreSQL custom dump is checked with `pg_restore --list`; archive contents are checked after encryption. The resulting `.ahrbackup` file is private and downloadable only through the platform-authorized endpoint. No unencrypted database archive is exposed for download. Temporary staging data is removed after completion/failure; a hard process or host crash can leave private `.building-*` staging directories that an operator should remove after confirming no job is active.

Backups are retained until an operator removes them. There is no automatic retention policy or disk-space alerting yet; provision and monitor storage accordingly. Avoid changing media files during a backup; changed files cause the run to fail rather than silently produce inconsistent file checksums. Database and media snapshots are sequential, so use a quiet period or maintenance window for a coordinated restore point. Server secrets (SMTP/Stripe credentials, signing keys, backup key), PostgreSQL cluster roles, deployment configuration and external object stores need their own recovery plan; this is an application database/media backup.

## Scheduling and history

Configure database/media selections, then save settings. Run a backup immediately or enable daily, Monday weekly, or first-day-of-month scheduling in the chosen time zone. Automatic schedules are off by default. The backend scheduler checks every 30 seconds; it must be running for scheduled jobs to execute. There is one active platform backup at a time, guarded by PostgreSQL advisory locks and a unique active-job constraint. History records requester, timestamps, status, artifact checksum and cloud-copy status. If the worker stops, interrupted RUNNING jobs are marked failed when a scheduler safely obtains the worker lock; queued jobs can run after restart. Back up again after an interrupted job.

`SUCCEEDED` means the local encrypted archive passed integrity checks and any requested cloud upload completed. `PARTIAL` means the local verified archive exists but its Google Drive copy failed. Download remains available for successful and partial jobs. Verify checks encryption authentication, archive manifest and file checksums; it does not mean a database restore drill has been performed.

## Google Drive

Optional server properties:

```
backup.drive-service-account-file=/secret-volume/drive-service-account.json
backup.drive-folder-id=SHARED_DRIVE_FOLDER_ID
```

The UI cannot enable cloud copying until these are configured. The service account needs access to the destination Shared Drive folder and the Drive API enabled. Only the encrypted archive is uploaded; key material is never uploaded. Credentials and destination are server-managed and are not returned to the browser. Google Drive is not configured or live-tested in the current local environment. See Google's [Shared Drive requirements](https://developers.google.com/workspace/drive/api/guides/about-shareddrives), [service account authentication](https://developers.google.com/identity/protocols/oauth2/service-account), and [file upload API](https://developers.google.com/workspace/drive/api/guides/manage-uploads).

## Recovery procedure

Perform recovery from a trusted administrative environment. Keep the application pointed at its live database while testing recovery in a separate empty database. Do not restore a dump over live data from the UI.

1. Preserve the encrypted archive and original encryption key. Verify the archive SHA-256 against backup history.
2. Build the backend runtime classpath with Maven `dependency:build-classpath`. Run `com.example.demo.backup.engine.BackupRecoveryTool` with three arguments: the archive path, original key path, and an empty private output directory. It verifies and extracts `database.dump`, media files and `manifest.json`. The key contents must never be placed in command arguments or logs.
3. Restore `database.dump` using `pg_restore --exit-on-error --no-owner --no-acl` into a separate empty PostgreSQL database. Review restored schemas, row counts, foreign keys and representative application workflows with external mail/payment/scheduler integrations disabled in that isolated environment.
4. Verify extracted media against manifest checksums. Store it in the recovery environment's media directory. Match server configuration and encryption/signing secrets separately.
5. Only plan a live recovery after the isolated drill passes. Coordinate downtime, freeze writes, preserve current data and use an explicit restore/cutover plan.
6. Remove decrypted drill files and the disposable database after verification. Keep the encrypted backup and its separately protected key.
