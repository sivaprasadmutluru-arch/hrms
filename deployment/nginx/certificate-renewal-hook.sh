#!/bin/sh
# Install at /etc/letsencrypt/renewal-hooks/deploy/accruehr-nginx.
case " $RENEWED_DOMAINS " in
  *" hr.accruetechnologies.com "*) /usr/sbin/nginx -t && /bin/systemctl reload nginx ;;
esac
