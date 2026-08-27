FROM nginx:alpine

# A imagem oficial nao traz o openssl, e ele e quem gera o certificado da origem.
RUN apk add --no-cache openssl

COPY nginx/docker-entrypoint.d/15-certificado.sh /docker-entrypoint.d/15-certificado.sh
RUN chmod +x /docker-entrypoint.d/15-certificado.sh

EXPOSE 80 443
