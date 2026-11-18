# syntax=docker/dockerfile:1
# Build. It runs on the build machine's own platform; only the nginx stage is per platform, so the arm64 image needs
# no emulation. Base images are pinned by digest (Dependabot keeps them current).
FROM --platform=$BUILDPLATFORM node:22.23.5-alpine3.24@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_MOCKING
ARG VITE_API_BASE_URL
ARG VITE_OIDC_AUTHORITY
ARG VITE_OIDC_CLIENT_ID=assay-spa
ARG VITE_DEMO_PASSWORD
# Pre-compressed copies of the text assets: nginx serves them as they are (gzip_static), with no work per request.
RUN npx vite build \
 && find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' -o -name '*.json' -o -name '*.txt' \) \
      -size +1k -exec gzip -9 -k {} +

# Serve: nginx as an unprivileged user (uid 101) on port 8080. Its package manager is removed once the image is
# upgraded. nginx starts directly (no entrypoint scripts); busybox stays only for the wget health check.
FROM nginxinc/nginx-unprivileged:1.31.7-alpine3.24@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e
USER root
RUN apk upgrade --no-cache && rm -rf /sbin/apk /etc/apk /lib/apk /usr/share/apk /var/cache/apk
USER 101
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx", "-g", "daemon off;"]
CMD []
