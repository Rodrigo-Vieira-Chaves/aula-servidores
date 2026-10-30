# Aula: WebSocket

Um chat e um joguinho, feitos para explicar **WebSocket** na prática: por que o HTTP não basta,
como o handshake transforma uma requisição HTTP numa conexão aberta, o que vai dentro de um frame,
e como ver tudo isso no DevTools do navegador.

O frontend tem três partes:

- **a aula** (`/`): dez telas, com diagramas e demonstrações ao vivo (polling × WebSocket lado a
  lado, o handshake que o seu navegador acabou de fazer, um montador de frames byte a byte e um
  laboratório para abrir, mandar e fechar conexões);
- **o chat** (`/chat/`): todo mundo conectado em `/ws/chat`, cada mensagem sai para todos;
- **o jogo** (`/jogo/`): cada um anda com um quadrado para a esquerda e para a direita, e quem move
  todo mundo é o servidor, 20 vezes por segundo.

O roteiro da aula está em [ROTEIRO.md](ROTEIRO.md).

## Stack

- **Backend**: NestJS com `@nestjs/websockets` e `@nestjs/platform-ws` (a biblioteca `ws`, ou seja,
  WebSocket puro, sem Socket.IO), na mesma estrutura do backend da aula de modelagem: `core/`,
  `api/rest/<recurso>` e agora `api/ws/<recurso>` para os gateways.
- **Frontend**: HTML estático, servido pelo próprio backend. Usa o `WebSocket` nativo do navegador.
- **Sem banco**: o histórico do chat fica em memória (reiniciar o backend apaga).
- **Infra**: Docker Compose com um serviço só, o `backend`. HTTP e WebSocket na mesma porta (3000).

```
backend/src/
  api/
    rest/mensagens/        <- GET (o polling) e POST (manda uma mensagem pelo HTTP)
    ws/chat/               <- gateway, service e repository do chat (comece por aqui)
    ws/jogo/               <- o jogo: o service guarda o estado e roda o tick
    ws/laboratorio/        <- usado pelas telas da aula: handshake, eco e "servidor fecha"
  core/
    conexoes/              <- conta as conexões, liga o heartbeat e manda close 1001 ao desligar
    health-check/          <- GET /health-check
  shared/
    ws/                    <- enviar/transmitir, heartbeat (ping/pong) e a conta do handshake
    filters/               <- erro de regra (400) vira o evento "exception" do WebSocket
    interceptors/          <- LOG_WS: imprime cada mensagem que chega
frontend/index.html        <- a aula
frontend/chat/index.html   <- o chat
frontend/jogo/index.html   <- o jogo
compose.yaml
```

## Rodando local

Requer Docker.

```bash
docker compose up -d --build
```

Abra http://localhost:3000. Na aula, as setas `←` `→` (ou PageUp e PageDown de um passador de
slides) andam pelo roteiro, e a tecla `M` esconde o menu lateral.

### Sem Docker (para mexer no código)

```bash
cd backend
npm install
npm run start:dev    # http://localhost:3000
```

## Rodando na AWS

```bash
git clone https://github.com/Rodrigo-Vieira-Chaves/aula-servidores.git
cd aula-servidores
docker compose up -d --build
```

No Security Group, libere a porta **3000** para todos (a turma abre o chat e o jogo pelo celular).
O WebSocket usa a mesma porta do site: não precisa abrir mais nada.

Se a EC2 é a mesma da aula de modelagem, atualize e remova os containers que sobraram dela
(`banco` e `adminer-aula`):

```bash
cd aula-servidores
git pull
docker compose up -d --build --remove-orphans
```

O volume `aula_dados-banco` fica lá, sem uso. Para apagar: `docker volume rm aula_dados-banco`.

## Variáveis de ambiente

Todas são opcionais e lidas pelo `compose.yaml`.

| Variável | Padrão | Para que serve |
|---|---|---|
| `PORTA` | `3000` | porta publicada do backend (HTTP e WebSocket) |
| `LOG_WS` | `true` | imprime no log cada mensagem que chega pelo WebSocket |
| `HEARTBEAT_MS` | `15000` | intervalo do ping do servidor; quem não responde pong até o próximo é derrubado |

## Comandos úteis

```bash
docker compose ps                     # estado do container
docker compose logs -f backend        # conexões abrindo e fechando (com o código) e as mensagens
docker compose restart backend        # todos recebem close 1001, reconectam e o chat volta vazio
docker compose down                   # para tudo

# Mensagem pelo HTTP, que chega a todos pelo WebSocket:
curl -X POST http://localhost:3000/api/mensagens \
  -H 'Content-Type: application/json' \
  -d '{"autor":"terminal","texto":"oi do curl"}'
```

## Endpoints

HTTP:

- `GET /health-check`: `{ status, noArDesde, conexoes: { chat, jogo, laboratorio } }`
- `GET /api/mensagens?depois=N`: mensagens com id maior que N (o polling)
- `POST /api/mensagens`: `{ autor, texto }`; a mensagem sai para todos pelo WebSocket

WebSocket (as mensagens são JSON no formato `{ "event": "...", "data": ... }`, que é o que o
`WsAdapter` do NestJS espera):

| Caminho | Navegador → servidor | Servidor → navegador |
|---|---|---|
| `/ws/chat` | `mensagem { autor, texto }` | `historico [...]` (ao conectar), `mensagem {...}` e `presenca { online }` (para todos) |
| `/ws/jogo` | `entrar { nome }`, `mover { direcao: -1 \| 0 \| 1 }`, `latencia { t }` | `estado { jogadores }` (a cada tick em que algo mudou), `voce { id }`, `latencia { t }` |
| `/ws/laboratorio` | `eco <qualquer coisa>`, `fechar` | `handshake {...}` (ao conectar), `eco`, e close 4000 |

Mensagem recusada por uma regra (nome vazio, mover sem ter entrado...) volta só para quem mandou,
como `{ "event": "exception", "data": { "status": "error", "message": "..." } }`.

## Problemas comuns

- **A página abre, mas o chat fica em "reconectando…"**: algo entre o navegador e o backend não
  repassa o `Upgrade`. Acontece com proxy (Nginx) sem as linhas de WebSocket; a configuração está
  na última tela da aula.
- **Página em `https://` e o WebSocket não conecta**: o frontend já troca para `wss://` sozinho,
  mas quem termina o TLS (Nginx, Cloudflare) precisa repassar o WebSocket. A Cloudflare repassa,
  mas só em algumas portas (80, 443, 8080...): a 3000 não está entre elas.
- **Porta 3000 em uso**: `PORTA=8080 docker compose up -d --build`.
- **`docker compose up` reclama de containers órfãos** (`banco`, `adminer-aula`): são da aula de
  modelagem. Use `--remove-orphans`.
- **Build travando em instância pequena**: a `t3.micro` tem 1 GB de RAM. Crie 1 GB de swap antes
  do build (os comandos estão no ROTEIRO.md) ou use uma `t3.small`.
