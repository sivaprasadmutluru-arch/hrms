# Deploy grecha.ai

`grecha.ai` already resolves to `66.116.245.215`, but port 80 is currently served by Apache's empty document root. The Spring Boot HRMS app is running on port `8080`, so Apache must reverse proxy the domain to `127.0.0.1:8080`.

## Apache reverse proxy

Run on the VPS:

```bash
sudo a2enmod proxy proxy_http headers rewrite
sudo nano /etc/apache2/sites-available/grecha.ai.conf
```

Use this virtual host:

```apache
<VirtualHost *:80>
    ServerName grecha.ai
    ServerAlias www.grecha.ai

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"

    ProxyPass / http://127.0.0.1:8080/
    ProxyPassReverse / http://127.0.0.1:8080/

    ErrorLog ${APACHE_LOG_DIR}/grecha.ai-error.log
    CustomLog ${APACHE_LOG_DIR}/grecha.ai-access.log combined
</VirtualHost>
```

Enable it:

```bash
sudo a2ensite grecha.ai.conf
sudo apachectl configtest
sudo systemctl reload apache2
```

After reload, `http://grecha.ai` should show the same app as `http://66.116.245.215:8080/`.

## HTTPS

After HTTP works:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d grecha.ai -d www.grecha.ai
```

If Certbot creates an SSL virtual host manually, make sure the HTTPS vhost also proxies to `127.0.0.1:8080` and sets:

```apache
RequestHeader set X-Forwarded-Proto "https"
RequestHeader set X-Forwarded-Port "443"
```

## App environment

For production, run the app with:

```bash
SPRING_PROFILES_ACTIVE=prod
CORS_ALLOWED_ORIGINS=http://grecha.ai,https://grecha.ai,http://www.grecha.ai,https://www.grecha.ai
```

The frontend is already built to call `/api`, so no frontend URL change is needed when the domain and API are served from the same host.
