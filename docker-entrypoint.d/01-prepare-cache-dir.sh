#!/bin/sh
set -eu

: "${NGINX_CACHE_PATH:=/tmp/nginx_cache}"

mkdir -p "${NGINX_CACHE_PATH}" "${NGINX_CACHE_PATH}/bom_tiles"
