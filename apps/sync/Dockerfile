# No `# syntax=` line on purpose: the built-in BuildKit frontend (Docker >= 23)
# supports secret mounts, and fetching docker/dockerfile from Docker Hub fails
# on many mainland-China servers.
#
# xuexi sync API (Node + SQLite). Build context = repository root:
#   docker build -f apps/sync/Dockerfile -t xuexi-sync .
# Only apps/sync and packages/shared are sent to the daemon
# (see apps/sync/Dockerfile.dockerignore).

# Base image, overridable when Docker Hub is slow/blocked, e.g.
#   --build-arg NODE_IMAGE=mirror.ccs.tencentyun.com/library/node:22-alpine
ARG NODE_IMAGE=node:22-alpine

# ---- build: bundle src/node.ts into one file with esbuild ----
FROM ${NODE_IMAGE} AS build
# Mainland-China servers: --build-arg NPM_REGISTRY=https://registry.npmmirror.com
ARG NPM_REGISTRY=https://registry.npmjs.org
WORKDIR /build
COPY apps/sync/package.json apps/sync/package.json
# Install hono, @hono/node-server and esbuild with npm (versions from
# package.json). The workspace-only dependency @xuexi/shared is dropped here;
# the build script resolves it to packages/shared/src via an esbuild alias.
# An optional build secret `npm_ca` (PEM) is trusted for TLS-intercepting proxies:
#   docker build --secret id=npm_ca,src=/path/ca.pem ...
RUN --mount=type=secret,id=npm_ca,required=false \
    cd apps/sync \
 && if [ -s /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; fi \
 && node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));const d={...p.dependencies,...p.devDependencies};for(const k of Object.keys(d)){if(String(d[k]).startsWith('workspace:'))delete d[k]}fs.writeFileSync('package.json',JSON.stringify({name:'sync-build',private:true,type:'module',dependencies:d}))" \
 && npm install --no-audit --no-fund --loglevel=error --registry="$NPM_REGISTRY"
COPY packages/shared/src packages/shared/src
COPY apps/sync/src apps/sync/src
COPY apps/sync/scripts apps/sync/scripts
RUN node apps/sync/scripts/build-node.mjs /out

# ---- runtime: node + two bundled files, nothing else ----
FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    PORT=8787 \
    HOST=0.0.0.0 \
    DB_PATH=/data/xuexi.db
WORKDIR /app
COPY --from=build /out/ /app/
RUN mkdir -p /data /backups && chown node:node /data /backups
USER node
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/api/health >/dev/null || exit 1
# node:sqlite still prints an ExperimentalWarning on Node 22; silence it.
CMD ["node", "--disable-warning=ExperimentalWarning", "server.mjs"]
