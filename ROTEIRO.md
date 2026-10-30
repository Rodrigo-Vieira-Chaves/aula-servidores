# Roteiro da aula: WebSocket

**Objetivo:** entender por que o HTTP não basta quando o servidor precisa avisar o navegador, como
o WebSocket resolve isso (handshake, frames, ping/pong, close) e como enxergar tudo no DevTools.
No fim, ver o mesmo padrão do backend da aula de modelagem (controller → service → repository)
aplicado a um gateway WebSocket.

**Fio condutor:** um chat e um joguinho. O chat mostra o broadcast (uma mensagem entra, sai para
todos). O jogo mostra o servidor como dono do estado, mandando atualizações num ritmo fixo.

A ordem abaixo é a ordem das telas. As setas `←` `→` (ou o passador de slides) andam entre elas, e
a tecla `M` esconde o menu para sobrar espaço no projetor.

---

## Antes da aula

- [ ] `git push` feito: a EC2 vai clonar (ou dar `git pull`) do GitHub
- [ ] Testado na sua máquina: `docker compose up -d --build` e http://localhost:3000 abre
- [ ] O servidor no ar (parte 1) e o endereço `http://IP-PUBLICO:3000` abrindo no seu celular, fora
  do wi-fi da faculdade (no 4G): é o teste de que o Security Group está certo
- [ ] Chrome **e** Firefox instalados no notebook do projetor (a parte do protocolo fica melhor no
  Firefox)
- [ ] Um terminal com `ssh` no servidor, para os logs e o `curl`

Se você reiniciar o backend antes da aula, o chat começa vazio (o histórico fica em memória).

---

## 1. Subir o servidor

A turma vai abrir o chat e o jogo pelo celular, então o backend precisa estar num endereço público.
Dá para fazer antes da aula; o importante é a porta 3000 aberta.

### Se a EC2 da aula de modelagem ainda existe

```bash
ssh -i aula-modelagem.pem ubuntu@IP-PUBLICO
cd aula-servidores
git pull
docker compose up -d --build --remove-orphans
```

O `--remove-orphans` apaga os containers `banco` e `adminer-aula`, que eram da aula anterior e não
estão mais no `compose.yaml`. O volume com os dados do banco continua lá (`docker volume ls`).

Confira o IP: **parar e iniciar a instância troca o IP público**.

### Se for criar uma EC2 nova

Os passos detalhados estão no ROTEIRO da aula de modelagem (no histórico do git, commit `28f9f68`).
O resumo:

1. **EC2 → Launch instances**: Ubuntu 24.04 ou 26.04, `t3.small`, key pair `.pem`, 20 GiB.
2. Security Group: **22** só para o seu IP, **3000** para todo mundo (`0.0.0.0/0`).
3. No servidor:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit                                   # entre de novo para o grupo docker valer
git clone https://github.com/Rodrigo-Vieira-Chaves/aula-servidores.git
cd aula-servidores
docker compose up -d --build
```

Só com a `t3.micro` (1 GB de RAM), crie um swap antes do build:

```bash
sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
```

### Conferindo

```bash
docker compose ps                      # backend Up (healthy)
docker compose logs -f backend         # deixe aberto num terminal durante a aula
```

O selo verde no topo da aula mostra **backend ok · N conexões abertas**. Repare (e comente mais
tarde) que esse selo é atualizado **por polling**, a cada 10 s: um número que muda devagar não
precisa de WebSocket.

Vale comentar: o WebSocket usa a **mesma porta** do site. Não foi preciso abrir nada além da 3000.

---

## 2. O problema (telas 1 e 2)

**Tela 1: HTTP só responde.** Comece pela pergunta da tela e deixe a turma responder: "chegou uma
mensagem nova; como o servidor avisa o navegador da Ana?". A resposta que se espera é "não avisa:
ela tem que perguntar". Os três diagramas mostram HTTP comum, polling e WebSocket.

- Long polling e SSE existem e funcionam; a última tela compara todos.
- WebSocket = uma conexão TCP que fica aberta, e os dois lados falam quando quiserem (full-duplex).

**Tela 2: Polling × WebSocket, ao vivo.** O primeiro momento com a turma no celular:

1. Passe o endereço `http://IP-PUBLICO:3000/chat/` e peça para todos mandarem um "oi".
2. Na tela, o painel da esquerda pergunta a cada 2 s; o da direita só espera.
3. Repare nos quadradinhos cinzas: cada um é uma requisição HTTP que não trouxe nada.
4. Cada mensagem aparece "na hora" no WebSocket e "X s depois" no polling.
5. Troque para "a cada 1 s": mais quadradinhos, menos atraso. O atraso médio é metade do intervalo.

A conta para a turma: 40 alunos fazendo polling a cada 1 s são 40 requisições por segundo, quase
todas vazias, só para descobrir que nada mudou.

## 3. O protocolo (telas 3 e 4)

**Tela 3: O handshake.** Tudo o que está na tela é real: é o handshake que o seu navegador acabou de
fazer com o servidor.

- A requisição é um `GET` HTTP/1.1 comum, com `Upgrade: websocket` e `Connection: Upgrade`.
- A resposta é **101 Switching Protocols**. Daqui em diante, nada de HTTP nessa conexão.
- A conta do `Sec-WebSocket-Accept`: chave + GUID fixo → SHA-1 → base64. Não é segurança: prova
  que o servidor entendeu o pedido (e que não é um cache devolvendo uma resposta velha).
- Clique em **Refazer o handshake**: chave nova, accept novo.
- O JavaScript da página não enxerga esses cabeçalhos. Quem mostra é o servidor, que devolve num
  frame o que recebeu. No DevTools (tela 6) eles aparecem direto.
- `ws://` está para `http://` como `wss://` está para `https://`. O Cookie vai junto no handshake.

**Tela 4: O frame.** O coração da parte de protocolo. Vá clicando nos exemplos e deixe a turma
prever o que muda:

- **"oi"**: 2 bytes de dados, 6 de cabeçalho (2 fixos + 4 da chave da máscara). Total: 8 bytes.
  Compare com as centenas de bytes de cabeçalho de uma requisição HTTP.
- Leia o **byte 1** (`0x81`): FIN = 1 (mensagem inteira) e opcode = 1 (texto).
- Leia o **byte 2**: MASK = 1 e o tamanho em 7 bits.
- **"acentos e emoji"**: 6 caracteres, 11 bytes. O tamanho é em bytes UTF-8, não em caracteres.
- **"130 caracteres"**: passou de 125, o tamanho vira 126 e o valor real vem em 2 bytes extras.
- **"70 mil caracteres"**: passou de 65 535, vira 127 e vem em 8 bytes. Cabeçalho máximo: 14 bytes.
- A tabela do XOR: cada byte dos dados passa por um XOR com a chave. A chave vai junto, então
  **máscara não é criptografia**. Ela existe por causa de proxies antigos (veja a nota da tela).
- Troque para **servidor → navegador**: sem chave e sem máscara. O servidor nunca mascara.

Feche com a tabela de opcodes: texto, binário e os três de controle (close, ping, pong).

## 4. No navegador (telas 5 e 6)

**Tela 5: A API e o ciclo de vida.** O código à esquerda é tudo o que a página precisa. No
laboratório, siga esta ordem e acompanhe os quadros do `readyState`:

1. **Conectar**: CONNECTING → OPEN. A primeira mensagem que chega é o handshake.
2. **Enviar** e **Mandar 10 seguidas**: cada uma volta (eco).
3. **Servidor fecha (4000)**: quem começa o close é o servidor; o código e o motivo chegam no
   evento `close`, com `wasClean = true`.
4. **Conectar** de novo e **Eu fecho (1000)**: agora quem começa é o navegador.

Pontos para comentar:

- A API **não reconecta sozinha**. O chat e o jogo têm um `setTimeout` para isso.
- O servidor manda **ping a cada 15 s**; o navegador responde pong sozinho e o JavaScript nem fica
  sabendo. Quem não responde até o ping seguinte é derrubado (aparece no log com o código 1006).
- 1006 nunca vai no fio: é o navegador avisando que a conexão caiu sem frame de close.

**Tela 6: Vendo no DevTools.** Faça ao vivo, com o projetor:

1. Chrome: `F12` → **Network** → filtro **Socket** (ou **WS** em versões antigas).
2. **Conectar** no laboratório da tela. Clique na linha `laboratorio` (status 101).
3. Aba **Headers**: o mesmo handshake da tela 3, agora pelo navegador.
4. Aba **Messages**: mande algumas mensagens. ↑ verde = enviada, ↓ vermelha = recebida. Clique numa
   para ver o JSON. "Servidor fecha (4000)" aparece como o frame de close.
5. Repita no **Firefox** (`F12` → Network → WS → aba **Response**). Clique com o botão direito no
   cabeçalho da tabela e ligue **OpCode**, **MaskBit** e **FinBit**: MaskBit `true` nas enviadas e
   `false` nas recebidas, exatamente como na tela 4. No filtro da tabela, ligue **Control Frames** e
   espere 15 s: aparece o ping (opcode 9) do servidor e o pong (opcode 10) do navegador.

Bônus: abra o DevTools na aba do `/chat/` enquanto a turma conversa. Cada mensagem de cada aluno
aparece como um frame recebido. E pelo **Console** dá para abrir uma conexão na mão (o código está
na tela).

## 5. No código (tela 7)

Mostre que é a mesma arquitetura do sistema de atendimento:

- [chat.gateway.ts](backend/src/api/ws/chat/chat.gateway.ts): o gateway é o "controller" do
  WebSocket. Em vez de rotas, eventos: `handleConnection`, `handleDisconnect` e
  `@SubscribeMessage('mensagem')`.
- [chat.service.ts](backend/src/api/ws/chat/chat.service.ts): guarda as conexões abertas num `Set`
  e faz o broadcast. As regras (nome, mensagem vazia, tamanho) moram aqui.
- [enviar.ts](backend/src/shared/ws/enviar.ts): o protocolo não tem "mandar para todos". O
  `transmitir()` é um `for` mandando o mesmo texto para cada conexão.
- [mensagens.controller.ts](backend/src/api/rest/mensagens/mensagens.controller.ts): a porta HTTP
  do mesmo chat, chamando o mesmo service.

Faça a demonstração do `curl` do terminal do servidor (ou do seu notebook, trocando o IP):

```bash
curl -X POST http://IP-PUBLICO:3000/api/mensagens \
  -H 'Content-Type: application/json' \
  -d '{"autor":"professor","texto":"oi do terminal"}'
```

A mensagem aparece no celular de todos, com o selo "via HTTP": entrou por uma requisição comum e
saiu pelo WebSocket.

No terminal com `docker compose logs -f backend`, aparecem as conexões abrindo e fechando (com o
código) e cada mensagem que chega.

## 6. Os sistemas (telas 8 e 9)

**Tela 8: O chat.** A tabela é o "protocolo da aplicação": o WebSocket só leva texto, e o formato
(`{ event, data }`) é combinado entre o front e o back. Repare em quem recebe cada evento: o
`historico` só vai para quem conectou; `mensagem` e `presenca` vão para todos.

Demonstração da queda:

```bash
docker compose restart backend
```

Todos veem "caiu (código 1001), reconectando…" e voltam sozinhos em 2 segundos. O 1001 ("indo
embora") é o servidor avisando antes de desligar. O histórico some, porque estava em memória.

**Tela 9: O jogo.** Passe `http://IP-PUBLICO:3000/jogo/` e deixe todo mundo jogar com a tela no
projetor (ela só assiste). Repare no contador: ninguém andando, 0 frames por segundo; alguém
andando, 20 por segundo, um por tick.

- O navegador só manda a **intenção** (`direcao: -1, 0 ou 1`), e só quando aperta ou solta a tecla.
- O servidor move todo mundo a cada 50 ms e manda **um** `estado` para todos.
- Desafio para a turma: trapacear pelo Console do `/jogo/`. Com o DevTools aberto, eles conseguem
  achar a conexão, mas mesmo mandando `{"event":"mover","data":{"direcao":50}}` o servidor só usa o
  sinal. Ninguém anda mais rápido. Servidor autoritativo.
- A latência é medida pela aplicação (o navegador não deixa o JavaScript mandar ping). No DevTools,
  ligue o **Throttling** (Slow 4G) e veja o quadrado responder com atraso.

## 7. Na vida real e fechamento (tela 10)

- A tabela: WebSocket é para quando **os dois lados** precisam falar a qualquer momento. Para
  notificações só do servidor, SSE é mais simples. Para quase todo o resto, HTTP comum.
- **Proxy**: `Upgrade` e `Connection` não passam sozinhos por um Nginx. Sem as linhas da tela, o
  handshake não chega ao backend.
- **Dois backends**: o `Set` de conexões fica na memória de cada processo. Pergunte à turma: "se a
  Ana está no backend 1 e o Bruno no 2, a mensagem da Ana chega no Bruno?". Não chega. A saída
  comum é um Redis pub/sub entre eles.
- **Segurança**: conferir o `Origin`, autenticar no handshake, validar toda mensagem (o jogo é o
  exemplo), `wss://` em produção.
- **Socket.IO**: é uma biblioteca com protocolo próprio por cima do WebSocket. Um `new WebSocket()`
  puro não conversa com ela.

Leia a caixa "Para fechar" da tela como resumo.

### Para praticar

1. Adicione ao chat o evento `digitando`: o navegador avisa quando a pessoa começa a digitar, e o
   servidor repassa para os outros (para todos menos quem mandou).
2. Limite a frequência: no máximo 5 mensagens por segundo por conexão. Recuse com `exception` ou
   feche com um código da faixa 4000?
3. No jogo, mande só o que mudou (`{ id, x }`) em vez da lista inteira. Quantos bytes economiza com
   30 jogadores?
4. Troque o polling do selo do topo da aula por SSE (`EventSource`). O que muda no DevTools?

### Depois da aula

A instância cobra enquanto existir. No console: **EC2 → Instances →** selecione a instância **→
Instance state → Terminate (delete) instance**.
