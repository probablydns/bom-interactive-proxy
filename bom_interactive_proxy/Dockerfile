ARG BUILD_FROM
FROM ghcr.io/probablydns/bom-interactive-proxy:latest AS upstream

FROM ${BUILD_FROM}

RUN apk add --no-cache nginx gettext curl

ENV NGINX_CACHE_PATH=/tmp/nginx_cache
ENV NGINX_CACHE_KEYS_ZONE_SIZE=64m
ENV NGINX_CACHE_MAX_SIZE=2g
ENV NGINX_CACHE_INACTIVE=24h

COPY --from=upstream /etc/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=upstream /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY --from=upstream /etc/nginx/templates/nginx-cache.conf.template /etc/nginx/templates/nginx-cache.conf.template
COPY --from=upstream /usr/share/nginx/html /usr/share/nginx/html

COPY run.sh /run.sh
RUN chmod a+x /run.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["/run.sh"]

LABEL \
  io.hass.name="BOM Interactive Proxy" \
  io.hass.description="BOM interactive weather map proxy" \
  io.hass.type="addon"
