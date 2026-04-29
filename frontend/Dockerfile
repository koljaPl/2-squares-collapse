FROM nginx:alpine

# envsubst is provided by gettext in alpine
RUN apk add --no-cache gettext

# Copy nginx config template (BACKEND_HOST will be injected at runtime)
COPY frontend/nginx.conf /etc/nginx/nginx.conf.template

# Copy static files
COPY frontend/index.html frontend/style.css frontend/app.js frontend/pdfs.html /usr/share/nginx/html/

# Fix permissions
RUN chmod -R 644 /usr/share/nginx/html/*

EXPOSE 80

# Substitute env vars in nginx config, then start nginx
CMD ["/bin/sh", "-c", "envsubst '${BACKEND_HOST}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]