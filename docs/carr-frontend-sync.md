# CARR frontend/backend synchronization

The earlier CARR updates changed backend static assets while the hrms-web source still contained the previous screen. Frontend rebuilds could therefore replace the reference design with that old source.

This backend bundle was built from hrms-web commit d2206602a4a8f3c035e5fdfce98f351f388f4b72. The frontend source now contains the CAR reference UI, Accountability validation, task workflow, and employee role/company selector restrictions. Existing generated bundles are retained for older cached asset requests; index.html references the fresh generated bundles.

The Maven frontend build now passes the backend static-directory path explicitly instead of relying on the frontend's default sibling-folder output. Pull both branches before building and deploy/restart the new artifact to update a running environment.

Verification: frontend build and backend packaging passed. All 170 generated files matched between the frontend output, backend static directory and packaged JAR. Ten frontend tests and isolated Chrome desktop/mobile/wizard/header checks passed. The UI checks used fixtures and made no database writes.
