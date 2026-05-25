# syntax=docker/dockerfile:1.7
#
# Inkstone — multi-stage Dockerfile.
# Stage 1 (`web-builder`): build the static React/Vite frontend.
# Stage 2 (`web`):         minimal nginx image serving the frontend (CI/preview).
# Stage 3 (`tauri-builder`): cross-build the Linux desktop binary + AppImage.
# Stage 4 (`tauri-runtime`): tiny image carrying just the AppImage + .deb.
#
# Build the web image only:
#   docker build --target web -t inkstone:web .
# Build Linux installers:
#   docker build --target tauri-runtime -t inkstone:linux .

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Frontend build
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS web-builder
WORKDIR /app

ENV CI=1 \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .
RUN npm run typecheck \
 && npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Web preview image (nginx)
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS web
COPY --from=web-builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK CMD wget -q -O- http://127.0.0.1:8080/ || exit 1

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — Tauri Linux builder
# ─────────────────────────────────────────────────────────────────────────────
FROM rust:1.82-bookworm AS tauri-builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl file build-essential \
        libssl-dev pkg-config \
        libgtk-3-dev libwebkit2gtk-4.1-dev libsoup-3.0-dev \
        librsvg2-dev libayatana-appindicator3-dev \
        xdg-utils libxdo-dev \
        nodejs npm \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/src-tauri/target \
    npm run tauri:build -- --bundles deb,appimage,rpm

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4 — Tauri runtime (artifact carrier)
# ─────────────────────────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS tauri-runtime
WORKDIR /artifacts
COPY --from=tauri-builder /app/src-tauri/target/release/bundle ./bundle
CMD ["ls", "-la", "bundle"]
