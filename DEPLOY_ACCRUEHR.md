# Deploy AccrueHr

Choose a domain you own and point its DNS at your server. The examples below use `example.com` as a placeholder; replace it with your actual domain. Configure Apache or Nginx to proxy `/` and `/api` to the backend on `127.0.0.1:8080`, then enable HTTPS for your domain.

Set these backend environment values for your deployment:

```sh
SPRING_PROFILES_ACTIVE=prod
APP_FRONTEND_URL=https://example.com
BILLING_FRONTEND_URL=https://example.com
CORS_ALLOWED_ORIGINS=https://example.com
```

`APP_FRONTEND_URL` controls welcome and password-reset links. Configure the billing URL separately for payment return links. The frontend calls `/api` on the same origin. Keep SMTP passwords in private runtime configuration or the deployment secret store.
