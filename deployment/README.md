# AccrueHR production deployment

Production: https://hr.accruetechnologies.com
Host: 187.127.153.232. Initial release: `20261103-222831` (3 November 2026).

## Layout

- `/opt/accruehr/current`: active release symlink.
- `/opt/accruehr/releases/<release>`: Compose, Dockerfiles, application JAR and clean frontend build.
- `/opt/accruehr/shared/backend.env` and `database.env`: root-only credentials/configuration. Never commit, print, or share these files.
- `/opt/accruehr/shared/config`: private SMTP and website-integration settings, mounted read-only.
- `/opt/accruehr/shared/data`: persistent uploads, encrypted application backups and their original encryption key.
- `/opt/accruehr/shared/postgres`: PostgreSQL data; do not delete or copy while running as a backup method.
- `/opt/accruehr/shared/rollback`: protected pre-deployment Nginx inventory and post-launch database snapshot.

Docker project `accruehr` contains separate frontend, backend and PostgreSQL services. Only frontend port `127.0.0.1:4184` is published. Host Nginx terminates HTTPS and proxies to that port. The database and backend have no host-published ports. Existing Accrue Technologies and Purchoose containers/configuration remain separate.

## Operations

```sh
cd /opt/accruehr/current
docker compose ps
docker compose logs --tail=100 backend
docker compose up -d --wait --wait-timeout 600
```

Persistent settings are outside release directories. Restart/recreate the backend after changing its environment. Use Spring's canonical environment spelling: `SPRING_DATASOURCE_HIKARI_CONNECTIONTIMEOUT`, `MAXIMUMPOOLSIZE`, `MINIMUMIDLE`. Extra underscores can cause nested property binding and premature pool startup; see https://github.com/spring-projects/spring-boot/issues/51363.

The backend runs Java 21 as UID 10001 with a read-only image, writable data mount, temporary directory and a 1 GB Java heap. PostgreSQL is version 16; matching `pg_dump`/`pg_restore` clients are included in the backend. The frontend runs as UID 101 with writable temporary mounts owned by that UID.

## Releases and rollback

Build the backend with `-Dfrontend.skip=true`; build Vite to an explicit temporary output directory. The default frontend build can empty the backend static directory. Stage `app.jar`, `frontend/`, `docker/`, `compose.yaml`, and an `.env` with a unique `RELEASE_ID`. Build images, health-check the new release, and update `current` only after success. Keep old images and release files for rollback.

`restore-and-start.sh` is **only for the initial migration**. It refuses an already-restored/nonempty database. Do not remove its guard to deploy updates. A code rollback should select the previous release/images while retaining the shared data. If a release changes database structure, assess compatibility first; restoring a snapshot overwrites newer records and requires an explicit recovery decision.

For consistent backups, use PostgreSQL dumps plus uploads, encrypted backup key, private configuration and release metadata. The initial migration dump and post-launch dump are root-only server snapshots. They are not an independent off-site backup. Configure and test off-site retention/recovery separately before relying on this server for critical records.

## HTTPS

Nginx site: `/etc/nginx/sites-available/accruehr`. Certificate: `/etc/letsencrypt/live/hr.accruetechnologies.com/`. The issued certificate is valid until 1 February 2027. Certbot timer is active; the scoped `accruehr-nginx` deploy hook checks and reloads Nginx after certificate renewal. The renewal dry-run was attempted twice, but the ACME staging service reset the connection both times; simulated renewal remains unverified. The initial live issuance succeeded. HTTP redirects to HTTPS. Authentication endpoints have request throttling. API documentation is disabled in production.

## Initial verification

- All three AccrueHR containers healthy.
- Public HTTPS login/SPA and HTTP-to-HTTPS redirect passed.
- Pricing and organization careers APIs returned 200; unauthenticated `/api/auth/me` returned 401.
- Incorrect login returned 401 with `Invalid username or password`.
- Existing admin login, account profile, organizations, organization 145 and plan-limits APIs returned 200.
- Migrated counts: 1 organization, 14 login records, 2 employees. Load-test organizations/employees were excluded.
- Gmail STARTTLS and SMTP authentication passed; no test email was sent during deployment.
- PostgreSQL 16 backup client and readable post-launch dump archive verified.
- Existing `accruetechnologies.com` and `purchoose.com` both returned HTTPS 200 after deployment.

Payment bypass/manual activation remains enabled as requested; live Stripe payments are not configured. This deployment does not certify high-concurrency capacity: the prior isolated load test still showed timeouts at 100–200 simultaneous clients. Monitor resource use and complete capacity tuning before a large launch. A full production browser workflow and disaster-recovery restore were not performed during deployment.
