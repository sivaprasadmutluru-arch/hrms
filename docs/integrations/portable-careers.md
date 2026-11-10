# Portable careers integration

Organizations can keep their own website and use AccrueHr for hiring. In **Recruitment → Job Posts → Website integration**, copy the organization's link, widget snippet or public feed URL. A company must be selected so the snippet belongs to the correct organization.

## Installation

Deploy AccrueHr on a public HTTPS origin and set the backend `app.frontend-url` (or `APP_FRONTEND_URL`) to that exact origin, without a trailing path. Serve the frontend, `/api` and `/careers-widget.js` through the same origin. Localhost URLs only work on the local computer.

Example (replace the hostname and organization slug):

```html
<script src="https://hr.example.com/careers-widget.js" defer crossorigin="anonymous"></script>
<accruehr-careers organization="your-organization" accent="#2868a9"></accruehr-careers>
```

Paste into an HTML/custom-code block. WordPress and page builders must allow script tags; if they strip scripts, install it through their approved custom-code mechanism, or use a normal careers link. A site with a Content Security Policy must permit the AccrueHr origin in `script-src` and `connect-src`. The widget uses an inline stylesheet in its shadow root; restrictive `style-src` policies must permit this or use the JSON feed with your site's own rendering instead.

No iframe, third-party cookies, HR token or secret API key is required. The widget uses a shadow root to isolate website styling, supports narrow screens and multiple organizations on the same page, and displays loading, empty and retry states. Set a six-digit hex accent color with sufficient text contrast. Existing widgets refresh on page load and when their organization attribute changes. They do not poll continuously.

Applications open on the hosted AccrueHr form in a new tab. The website never receives resume files or candidate details. The same organization-specific form enforces publication/closing dates, consent, duplicate prevention and private PDF handling. Publishing or closing a role is managed in Job Posts. No application is created by installing the widget.

## Public JSON feed

```http
GET https://hr.example.com/api/public/careers/your-organization/jobs
GET https://hr.example.com/api/public/careers/your-organization/jobs/123
```

Response: `apiVersion: 1`, `organization`, `slug`, `careersUrl`, and `jobs` (or `job`). Jobs contain `id`, `title`, `description`, `department`, `location`, `type`, `deadline`, `companyName`, `applyUrl`. Fields may be null. Render text as text, never untrusted HTML, and direct Apply buttons to `applyUrl`. Only active, published, open roles within their publication window are returned. Unknown/suspended organizations and inaccessible jobs return 404.

Cross-origin GET is public and credential-free (`Access-Control-Allow-Origin: *`). This does not open authenticated HR endpoints, private resumes or candidate listings. Application POST is intended for the hosted same-origin form; third-party sites should use the hosted apply link, not credentialed cross-origin submissions. No JSONP is supported.

## Deployment verification

- Verify `careersUrl`, `applyUrl` and script URLs use the production HTTPS origin.
- Load a copied widget on the organization's actual website; verify its CSP/page builder permits it.
- Verify only published jobs appear, closing a role removes it on reload, and another organization's job cannot be read/applied to through this slug.
- Test a consenting synthetic candidate through the hosted form and confirm it appears in the intended HR pipeline.
- Application throttling returns 429 with `Retry-After: 60`. The in-process safety net supports a single application instance. Before multi-node/public high-volume deployment, configure shared/edge rate limiting and request-size limits. Preserve real client IP only through a trusted proxy; do not trust arbitrary forwarded headers.
- Restrict application and proxy multipart sizes, back up private resumes outside the public static directory, define recruitment retention/deletion policy, and use malware scanning appropriate to your production upload environment. PDF signature/size checks are not a malware scanner.

External website installation, public DNS/TLS and edge configuration depend on the deployment operator. The local implementation does not publish any organization site automatically.
