# Aula: Modelagem de dados com PostgreSQL

Um mini sistema de atendimento, feito para explicar **modelagem de tabelas e relações** na
prática. Clientes abrem tickets, atendentes cuidam deles, o cliente avalia o atendimento e os
tickets recebem tags.

O modelo foi montado para ter um exemplo de cada coisa:

```
clientes 1 ──── N tickets N ──── 0..1 atendentes
                    1
                    │
                  0..1
                avaliacoes

tickets 1 ──── N tickets_tags N ──── 1 tags         (N:M pela tabela associativa)
```

| Conceito | Onde aparece |
|---|---|
| **1:N** | `clientes` → `tickets` (obrigatória) e `atendentes` → `tickets` (opcional) |
| **1:1** | `tickets` → `avaliacoes`: FK com `UNIQUE` |
| **N:M** | `tickets` ↔ `tags`, pela tabela associativa `tickets_tags` com PK composta |
| **Constraints** | `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `NOT NULL`, `CHECK`, `DEFAULT`, `ENUM` |
| **ON DELETE** | `RESTRICT` (clientes), `SET NULL` (atendentes), `CASCADE` (avaliações e tags) |
| **Consultas** | `SELECT`, `INNER JOIN`, `LEFT JOIN`, `RIGHT JOIN`, `FULL OUTER JOIN`, `UNION` / `UNION ALL` |

O frontend mostra cada consulta com o diagrama de Venn, as tabelas de origem coloridas (o que
casou, o que ficou de fora) e o resultado. O roteiro da aula está em [ROTEIRO.md](ROTEIRO.md).

## Stack

- **Backend**: NestJS + Prisma 7 (`@prisma/adapter-pg`), na mesma estrutura de um backend de
  produção: `core/database`, `api/rest/<recurso>`, `prisma/schema.prisma`, migrations e seed.
- **Banco**: PostgreSQL 18.
- **Frontend**: um único HTML estático, servido pelo próprio backend.
- **Infra**: Docker Compose com três serviços: `banco`, `backend` e `adminer` (interface web
  para o banco).

```
backend/
  prisma/
    schema.prisma          <- o modelo de dados (comece por aqui)
    migrations/            <- o SQL que cria as tabelas (gerado pelo Prisma + o CHECK escrito à mão)
    seed.ts                <- os dados da aula
  src/
    core/database/         <- DatabaseService: o PrismaClient
    api/rest/consultas/    <- SELECT, JOINs e UNION, em SQL puro
    api/rest/relacoes/     <- uma consulta por tipo de relação
    api/rest/constraints/  <- catálogo de constraints e os experimentos
    api/rest/tickets/      <- o mesmo dado pelo ORM, com include
    api/rest/tabelas/      <- SELECT * de cada tabela
frontend/index.html
compose.yaml
```

## Rodando local

Requer Docker.

```bash
docker compose up -d --build
```

Abra http://localhost:3000. Ao subir, o backend aplica as migrations e roda o seed. O seed só
insere dados se o banco estiver vazio, então reiniciar não duplica nada.

Na tela, as setas `←` `→` (ou PageUp e PageDown de um passador de slides) andam pelo roteiro, e a
tecla `M` esconde o menu lateral.

### Sem Docker (para mexer no código)

Com um Postgres rodando (pode ser só o `docker compose up -d banco`):

```bash
cd backend
cp .env.example .env
npm install
npm run generate     # gera o client do Prisma em src/generated
npm run migrate      # cria as tabelas
npm run seed         # popula
npm run start:dev    # http://localhost:3000
```

## Rodando na AWS

### Tudo num servidor

```bash
git clone https://github.com/Rodrigo-Vieira-Chaves/aula-servidores.git
cd aula-servidores
docker compose up -d --build
```

No Security Group, libere a porta **3000** para acessar a aplicação.

Para ver o banco pelo navegador, use o **Adminer** na porta **8081** e libere essa porta
**somente para o seu IP**: ela é uma tela de login para o banco, e a senha padrão está neste
repositório. Na tela de login, use o servidor `banco` (já vem preenchido), o usuário `app`, a
senha `aula123` e a base `aula`. Com o Adminer, a 5432 pode continuar fechada.

### Banco num servidor, backend em outro

No servidor do banco:

```bash
docker compose up -d banco
```

No servidor do backend:

```bash
DB_HOST=172.31.x.x docker compose up -d --build --no-deps backend
```

`DB_HOST` é o **IP privado** do servidor do banco. O `--no-deps` impede que o compose suba um
segundo banco na máquina do backend. No Security Group do banco, libere a 5432 apenas para o
Security Group do backend.

Para trocar a senha, crie um `.env` ao lado do `compose.yaml` (vale nos dois servidores):

```bash
DB_PASSWORD=uma-senha-de-verdade
```

## Variáveis de ambiente

Todas são opcionais e lidas pelo `compose.yaml`.

| Variável | Padrão | Para que serve |
|---|---|---|
| `DB_HOST` | `banco` | onde está o Postgres (o nome do serviço, ou o IP privado de outro servidor) |
| `DB_PORT` | `5432` | porta do Postgres |
| `DB_USER` | `app` | usuário |
| `DB_PASSWORD` | `aula123` | senha |
| `DB_NAME` | `aula` | nome do banco |
| `PORTA` | `3000` | porta publicada do backend |
| `BANCO_PORTA` | `5432` | porta publicada do Postgres |
| `ADMINER_PORTA` | `8081` | porta publicada do Adminer |
| `LOG_SQL` | `true` | imprime no log todo SQL enviado ao banco, inclusive o que o Prisma gera |

O backend em si só lê `DATABASE_URL`, `HTTP_PORT` e `LOG_SQL`. Quem monta a `DATABASE_URL` a
partir das variáveis acima é o compose.

## Comandos úteis

```bash
docker compose ps                                   # estado dos containers
docker compose logs -f backend                      # logs, inclusive os SQLs (LOG_SQL=true)
docker compose exec banco psql -U app -d aula       # psql dentro do container do banco
docker compose exec backend npm run seed:reset      # volta os dados ao estado inicial
docker compose down                                 # para tudo (os dados ficam no volume)
docker compose down -v                              # para tudo e APAGA o banco
```

No psql: `\dt` lista as tabelas, `\d tickets` mostra colunas, índices e constraints, `\q` sai.

## Endpoints

Todos devolvem `{ sql, dados }`: o SQL que rodou e o resultado.

- `GET /health-check`: estado da conexão com o banco (host e versão)
- `GET /api/tabelas`: `SELECT *` de cada tabela
- `GET /api/relacoes/um-para-muitos`, `/um-para-um`, `/muitos-para-muitos`
- `GET /api/consultas/select`, `/inner-join`, `/left-join`, `/right-join`, `/full-outer-join`,
  `/union`, `/union-all`
- `GET /api/constraints`: constraints que existem no banco, lidas do catálogo
- `GET /api/constraints/experimentos`: os experimentos e o SQL de cada um
- `POST /api/constraints/experimentos/:id`: roda um experimento **dentro de uma transação com
  ROLLBACK** e devolve como o banco reagiu. Os dados nunca mudam.
- `GET /api/tickets/:id`: o mesmo ticket pelo Prisma (`include`), sem SQL escrito à mão

## Problemas comuns

- **`P1001: Can't reach database server`** nos logs do backend: o backend não alcança o banco.
  Em dois servidores, confira o `DB_HOST` (tem que ser o IP **privado**) e o Security Group do
  banco (a 5432 liberada para o backend). O container tenta de novo sozinho.
- **`password authentication failed`**: a senha do `.env` não bate com a do banco. O Postgres só
  usa `POSTGRES_PASSWORD` **na primeira vez** que cria o volume. Se você trocou a senha depois,
  rode `docker compose down -v` (apaga os dados) e suba de novo.
- **Porta já em uso** (`5432` ou `3000`): use `BANCO_PORTA=5433` ou `PORTA=8080` antes do
  `docker compose up`.
- **Build travando em instância pequena**: a `t3.micro` tem 1 GB de RAM. Crie 1 GB de swap antes
  do build (os comandos estão no ROTEIRO.md) ou use uma `t3.small`.
- **`docker compose up` diz que o container `banco` já existe**: o compose reconhece os containers
  pelo nome do projeto (`name: aula`). Se o `banco` foi criado por outro compose ou por um
  `docker run`, apague com `docker rm -f banco` (o volume com os dados continua lá).
