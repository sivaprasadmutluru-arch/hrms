FROM nginx:stable-alpine
COPY frontend/ /usr/share/nginx/html/
COPY docker/frontend.nginx.conf /etc/nginx/conf.d/default.conf
USER 101:101
EXPOSE 8080
