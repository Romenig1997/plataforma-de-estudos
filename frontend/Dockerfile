# Build stage
FROM node:24-alpine AS build

WORKDIR /build

# Dependencias primeiro: aproveita o cache de camadas entre rebuilds
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage
FROM nginx:alpine AS runtime

# A imagem oficial do nginx processa os arquivos em templates com envsubst no
# início do container. Assim Railway pode informar PORT e API_UPSTREAM.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /build/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
