#!/bin/sh
set -e

CERT=/etc/nginx/certs/origin.crt
CHAVE=/etc/nginx/certs/origin.key

mkdir -p /etc/nginx/certs

# Se voce colocou o Origin Certificate do Cloudflare nessa pasta, ele e usado
# como esta — e ai da para subir o modo SSL para Full (strict).
if [ -s "$CERT" ] && [ -s "$CHAVE" ]; then
  echo "certificado de origem encontrado em $CERT"
  exit 0
fi

# Senao, um autoassinado serve: no modo Full o Cloudflare exige TLS na origem,
# mas nao valida quem assinou.
echo "nenhum certificado em /etc/nginx/certs — gerando um autoassinado"

openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
  -keyout "$CHAVE" -out "$CERT" \
  -subj "/CN=${DOMINIO:-origem}" 2>/dev/null

chmod 600 "$CHAVE"

echo "certificado autoassinado gerado — suficiente para o modo Full"
