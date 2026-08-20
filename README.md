# Aula: Servidores

Mini sistema usado para demonstrar, na prática, uma arquitetura com servidores separados:
banco de dados, dois backends e um frontend com Nginx fazendo proxy reverso e load balancing.

```
Internet
   |  :80
[ Frontend + Nginx ]
   |  proxy /api -> upstream
   +--------------+
   |              |
[ Backend 1 ]  [ Backend 2 ]
   +------+-------+
          |  :5432
   [ Banco de dados ]
```

## O que é

- **Backend** — Node + Express, um endpoint de busca de nomes. A resposta inclui o campo
  `servidor`, que identifica qual máquina respondeu (é o que torna o load balancing visível).
- **Frontend** — HTML estático com um campo de busca. Chama `/api/pessoas` em caminho relativo,
  então funciona tanto servido pelo backend (dev) quanto pelo Nginx (produção), sem CORS.
- **Banco** — PostgreSQL 18 com uma tabela `pessoas`.

## Rodando local

Requer Docker e um PostgreSQL acessível.

```bash
docker compose up -d --build
docker compose exec backend node migrate.js
```

Abra http://localhost:3000

## Rodando em um servidor

```bash
git clone https://github.com/Rodrigo-Vieira-Chaves/aula-servidores.git
cd aula-servidores

DB_HOST=172.31.5.69 \
DB_PASSWORD=aula123 \
DB_USER=app \
DB_NAME=aula \
NOME_SERVIDOR=Server1 \
docker compose up -d --build

docker compose exec backend node migrate.js
```

`DB_HOST` é o **IP privado** da instância do banco. `NOME_SERVIDOR` é o rótulo que aparece
no frontend — use `Server1` e `Server2` para que a alternância fique óbvia na tela.

A migration só precisa rodar uma vez, a partir de qualquer um dos backends: o banco é
compartilhado. Rodar de novo é seguro, o seed é ignorado se a tabela já tiver dados.

## Variáveis de ambiente

| Variável | Padrão | Para que serve |
|---|---|---|
| `DB_HOST` | `host.docker.internal` | endereço do PostgreSQL |
| `DB_PORT` | `5432` | porta do PostgreSQL |
| `DB_USER` | `postgres` | usuário |
| `DB_PASSWORD` | `postgres` | senha |
| `DB_NAME` | `aula` | banco |
| `NOME_SERVIDOR` | hostname do container | rótulo exibido no frontend |
| `PORT` | `3000` | porta do backend |

## Endpoints

- `GET /api/pessoas?busca=ana` — busca por trecho do nome, limite de 50 resultados
- `GET /api/health` — verifica a conexão com o banco
