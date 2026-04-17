FROM nginx:alpine

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Copy static files to nginx document root
COPY frontend/index.html frontend/style.css frontend/app.js frontend/pdfs.html /usr/share/nginx/html/

# Fix permissions
RUN chmod -R 644 /usr/share/nginx/html/*

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]