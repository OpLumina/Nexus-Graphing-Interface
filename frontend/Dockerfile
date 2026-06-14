# syntax=docker/dockerfile:1

# ---- shared dependency layer ----------------------------------------------
# ci installs exact locked versions; ignore-scripts blocks postinstall execution.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---- dev stage (docker-compose.dev.yml) -----------------------------------
# Hot-reloading Vite dev server. Source is bind-mounted by the dev compose
# overlay, so no COPY of app code here.
FROM node:22-slim AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---- build stage ----------------------------------------------------------
# Produces the static bundle (tsc && vite build). The version stamp comes from
# the NEXUS_VERSION build arg because the repo-root VERSION file (read by
# vite.config.mjs) lives outside this build context; vite.config falls back to
# process.env.NEXUS_VERSION when ../VERSION is unreachable (ENV-3).
FROM node:22-slim AS build
ARG NEXUS_VERSION=0.0.0
ENV NEXUS_VERSION=${NEXUS_VERSION}
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- prod stage (docker-compose.yml) --------------------------------------
# Static bundle served by nginx; /api is reverse-proxied to the backend with
# the SEC-5 token injected server-side so the browser never holds it. The token
# is substituted into the config at container start via nginx's envsubst
# template mechanism (NEXUS_API_TOKEN from the environment).
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
