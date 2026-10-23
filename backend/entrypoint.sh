#!/bin/sh
set -eu

# Cria ou atualiza as tabelas: aplica so as migrations que ainda nao rodaram neste banco.
npm run migrate

# Popula com os dados da aula, mas so se o banco estiver vazio.
npm run seed

exec node dist/main
