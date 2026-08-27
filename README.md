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

- **Backend** — Node + Express, busca de nomes protegida por login. A resposta inclui o campo
  `servidor`, que identifica qual máquina respondeu (é o que torna o load balancing visível).
- **Frontend** — HTML estático com tela de login e um campo de busca. Chama a API em caminho
  relativo por padrão, então funciona tanto servido pelo backend (dev) quanto pelo Nginx.
- **Banco** — PostgreSQL 18 com as tabelas `pessoas` e `usuarios`.

A sessão é um **JWT dentro de um cookie HttpOnly**. Como o token é assinado e não guardado em
lugar nenhum, qualquer um dos backends valida a sessão dos outros — desde que todos usem o
**mesmo `JWT_SEGREDO`**. É o que mantém o backend descartável mesmo com login.

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
JWT_SEGREDO=troque-isso-e-repita-igual-no-server2 \
docker compose up -d --build

docker compose exec backend node migrate.js
```

`DB_HOST` é o **IP privado** da instância do banco. `NOME_SERVIDOR` é o rótulo que aparece
no frontend — use `Server1` e `Server2` para que a alternância fique óbvia na tela.

A migration só precisa rodar uma vez, a partir de qualquer um dos backends: o banco é
compartilhado. Rodar de novo é seguro, o seed é ignorado se a tabela já tiver dados.

## Servidor de frontend (Nginx)

Na instância do frontend, clone o repositório e crie o `.env`:

```bash
cat > .env <<'EOF'
BACKEND1=172.31.1.179:3000
BACKEND2=172.31.x.x:3000
EOF

docker compose -f compose.frontend.yaml up -d
```

Use os **IPs privados** dos backends. Se ainda houver só um backend, omita `BACKEND2` que
ele assume o mesmo valor de `BACKEND1`.

O Nginx serve os arquivos de `frontend/` e faz proxy de `/api/` para os backends em
round-robin. A resposta traz o header `X-Backend` com o endereço de quem respondeu.

Para recarregar a configuração após editar o template:

```bash
docker compose -f compose.frontend.yaml up -d --force-recreate
```

## Domínio, HTTPS e CORS

Com o domínio apontado no Cloudflare, o navegador acessa a aplicação por HTTPS. Duas coisas
mudam em relação ao setup só com IP:

- **CORS** — se o frontend e a API ficarem em origens diferentes (por exemplo
  `rodrigovieirachaves.com` e `api.rodrigovieirachaves.com`), o backend precisa autorizar a
  origem do frontend em `ORIGENS_PERMITIDAS`. Se tudo passa pelo mesmo Nginx em caminho
  relativo, CORS nem aparece.
- **Cookie** — em HTTPS o cookie vai com `Secure`, e o frontend precisa mandar
  `credentials: 'include'` no `fetch`. Com `credentials`, o navegador **recusa**
  `Access-Control-Allow-Origin: *`: a origem tem que vir escrita por extenso.

`SameSite=Lax` (o padrão) já basta quando front e API estão no mesmo domínio ou em subdomínios
dele. Só use `COOKIE_SAMESITE=None` se forem domínios realmente diferentes — e nesse caso
`Secure` é obrigatório.

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
| `ORIGENS_PERMITIDAS` | domínio da aula | origens liberadas no CORS, separadas por vírgula |
| `JWT_SEGREDO` | segredo de aula | chave que assina a sessão — **igual nos dois backends** |
| `JWT_VALIDADE_SEGUNDOS` | `28800` | validade da sessão (8 h) |
| `COOKIE_SEGURO` | `true` | `Secure` no cookie; use `false` só em HTTP local |
| `COOKIE_SAMESITE` | `lax` | `lax`, `strict` ou `none` |
| `COOKIE_DOMINIO` | vazio | `Domain` do cookie, para compartilhar entre subdomínios |
| `USUARIO_DEMO` | `aluno` | usuário criado pela migration |
| `SENHA_DEMO` | `aula123` | senha desse usuário (guardada com hash bcrypt) |

## Endpoints

- `POST /api/login` — corpo `{ "usuario": "aluno", "senha": "aula123" }`; responde com o
  cookie de sessão em `Set-Cookie`
- `POST /api/logout` — apaga o cookie
- `GET /api/eu` — quem está logado; é como o frontend descobre se há sessão, já que o
  cookie é `HttpOnly` e o JavaScript não consegue lê-lo
- `GET /api/pessoas?busca=ana` — busca por trecho do nome, limite de 50 resultados
  (**exige login**)
- `GET /api/health` — verifica a conexão com o banco
