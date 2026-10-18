# Build stage
FROM node:24-alpine AS build

WORKDIR /build

# Dependencias primeiro: aproveita o cache de camadas entre rebuilds
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# O Vite grava as variaveis VITE_ no bundle durante o build. No Railway, as
# variaveis do servico chegam aqui como build args quando declaradas com ARG.
# A chave e a publica (anon/publishable): o banco e protegido por RLS.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

# Runtime stage
FROM nginx:alpine AS runtime

# A imagem oficial do nginx processa os arquivos em templates com envsubst no
# início do container. Assim Railway pode informar PORT e API_UPSTREAM.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /build/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
