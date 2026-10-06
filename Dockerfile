# syntax=docker/dockerfile:1

# ---- Etapa 1: build (dependències, lint, tests i compilació) ----
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run lint && npm test && npm run build

# ---- Etapa 2: nginx no privilegiat servint l'estàtic i fent de proxy ----
FROM nginxinc/nginx-unprivileged:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf

# BACKEND_URL sense barra final (p. ex. http://censo:8080).
# BACKEND_TOKEN s'ha de passar en arrencar (-e BACKEND_TOKEN=...): no té valor
# per defecte per no desar cap secret a la imatge; nginx l'envia com a
# capçalera Authorization cap al backend.
# NGINX_ENVSUBST_FILTER evita substituir variables pròpies d'nginx ($host...).
# REAL_IP_FROM: rang del balancejador/ingress (p. ex. 10.0.0.0/8); el valor per
# defecte no confia en ningú i fa servir la IP de connexió.
# RATE_LIMIT/RATE_BURST: generosos perquè el dia de les eleccions molts
# ciutadans comparteixen IP (CGNAT dels mòbils, wifi municipal).
ENV BACKEND_URL=http://censo:8080 \
    RATE_LIMIT=30r/m \
    RATE_BURST=20 \
    REAL_IP_FROM=127.0.0.1/32 \
    NGINX_ENVSUBST_FILTER="BACKEND_|RATE_|REAL_IP_"

EXPOSE 8080
