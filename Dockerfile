# BOM Interactive Proxy
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Cache path defaults (override at runtime if needed)
ENV NGINX_CACHE_PATH=/tmp/nginx_cache
ENV NGINX_CACHE_KEYS_ZONE_SIZE=64m
ENV NGINX_CACHE_MAX_SIZE=2g
ENV NGINX_CACHE_INACTIVE=24h

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf
COPY nginx-cache.conf.template /etc/nginx/templates/nginx-cache.conf.template

# Copy static files
COPY www/ /usr/share/nginx/html/

# Prepare entrypoint hooks (runs before nginx starts)
COPY docker-entrypoint.d/ /docker-entrypoint.d/

# Create required directories and ensure entrypoint hooks are executable
RUN mkdir -p /var/log/nginx \
    && chmod +x /docker-entrypoint.d/*.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
