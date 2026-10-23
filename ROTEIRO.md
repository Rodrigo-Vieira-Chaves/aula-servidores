# Roteiro da aula: modelagem de dados com PostgreSQL

**Objetivo:** sair do enunciado de um sistema e chegar nas tabelas, nas relações e nas regras do
banco. Depois, subir esse banco na AWS, ligar o backend nele e consultar os dados com JOIN e UNION.

**Fio condutor:** um mini sistema de atendimento, inspirado num sistema real de tickets. É pequeno
o suficiente para caber na lousa e tem todos os casos: 1:1, 1:N, N:M, relação opcional e as três
ações de `ON DELETE`.

A ordem abaixo é a ordem das telas do sistema. As setas `←` `→` (ou o passador de slides) andam
entre elas, e a tecla `M` esconde o menu para sobrar espaço no projetor.

---

## Antes da aula

- [ ] `git push` feito: a EC2 vai clonar o repositório do GitHub
- [ ] Testado na sua máquina: `docker compose up -d --build` e http://localhost:3000 abre
- [ ] Login no console da AWS funcionando, já na região que vai usar (ex.: São Paulo, `sa-east-1`)
- [ ] Um terminal com `ssh` (no Windows, o PowerShell já tem)

A EC2 é criada ao vivo, na parte 3. Se ela já foi criada antes:

- [ ] O Security Group tem a regra da porta **3000** liberada (sem ela, a turma não abre o sistema)
  e a da **8081** só para o seu IP (o Adminer)
- [ ] O IP público é o mesmo de antes: **parar e iniciar a instância troca o IP** (a não ser que
  ela tenha um Elastic IP)
- [ ] Se o banco já tiver os dados de um teste, rode `docker compose exec backend npm run seed:reset`

---

## 1. Do enunciado às entidades (lousa)

Escreva o enunciado na lousa:

> Clientes abrem tickets. Atendentes cuidam dos tickets. O cliente pode avaliar o atendimento.
> Os tickets recebem tags para organizar a fila.

- **Substantivos viram entidades** (tabelas): cliente, ticket, atendente, avaliação, tag.
- **Características viram atributos** (colunas): nome, e-mail, título, status, nota...
- **Verbos viram relações**: abre, cuida, avalia, recebe.

Para descobrir a cardinalidade, pergunte **nos dois sentidos** e deixe a turma responder:

| Relação | Ida | Volta | Resultado |
|---|---|---|---|
| cliente abre ticket | um cliente abre quantos tickets? **vários** | um ticket é de quantos clientes? **um** | **1:N** |
| atendente cuida de ticket | um atendente cuida de quantos? **vários** | um ticket tem quantos atendentes? **zero ou um** | **1:N opcional** |
| ticket recebe avaliação | um ticket tem quantas avaliações? **zero ou uma** | uma avaliação é de quantos tickets? **um** | **1:1** |
| ticket recebe tag | um ticket tem quantas tags? **várias** | uma tag está em quantos tickets? **vários** | **N:M** |

Puxe a discussão do "zero ou um": um ticket recém-aberto ainda não tem atendente, e isso vai
virar um `NULL` permitido. Essa decisão de modelagem é o que faz o LEFT JOIN e o RIGHT JOIN
mostrarem resultados diferentes mais tarde.

## 2. Do modelo ao banco

Ainda na lousa, ou já mostrando o [schema.prisma](backend/prisma/schema.prisma):

- **Tipos**: `SERIAL`/`INT`, `TEXT`, `BOOLEAN`, `TIMESTAMP` e um `ENUM` para o status.
- **Chave primária**: usamos um `id` gerado pelo banco, e não o e-mail. O e-mail muda, e uma PK
  não deveria mudar nunca. O e-mail continua único, mas com `UNIQUE`.
- **Como implementar cada relação** (este é o coração da aula):
  - **1:N**: a FK fica **sempre no lado N**: `tickets.cliente_id`.
  - **1:1**: é uma 1:N com `UNIQUE` na FK: `avaliacoes.ticket_id UNIQUE`.
  - **N:M**: não cabe numa FK só. Precisa de uma **tabela associativa**, `tickets_tags`, com uma
    FK para cada lado e PK composta `(ticket_id, tag_id)`. A N:M vira duas 1:N.
- **O que não fazer** (vale perguntar à turma por que está errado):
  - uma coluna `tags` com o texto `"urgente,financeiro"` quebra a 1ª forma normal: o banco não
    valida, não indexa e não faz JOIN;
  - copiar o nome do cliente para dentro do ticket cria redundância, e cedo ou tarde os dois
    nomes ficam diferentes.
- **Índices**: o Postgres cria índice para PK e UNIQUE, mas **não** para FK. Por isso o schema
  tem `@@index([clienteId])` e similares.

Depois, mostre o caminho do Prisma até o banco:

1. [schema.prisma](backend/prisma/schema.prisma): `model` é tabela, `@id` é PK, `@unique` é
   UNIQUE, `@relation` é FK, `@map` é o nome real da coluna, `@@id` é PK composta e `onDelete`
   define a ação.
2. [migration.sql](backend/prisma/migrations/20261023120000_init/migration.sql): o SQL que o
   Prisma gerou a partir do schema. Mostre as linhas no final:
   - os `ALTER TABLE ... FOREIGN KEY ... ON DELETE` com as três ações;
   - o `CHECK (nota BETWEEN 1 AND 5)`, que foi **escrito à mão**, porque o Prisma não sabe
     declarar CHECK. O ORM não cobre tudo, e a migration é SQL que você pode editar.
3. Para gerar uma migration nova em desenvolvimento: `npx prisma migrate dev --name <nome>`.

## 3. Subindo na AWS (ao vivo)

A arquitetura (desenhe na lousa):

```
navegador ──:3000──> EC2 Ubuntu ─┬─ container backend (NestJS)
                                 │        │ :5432
                                 └─ container banco (PostgreSQL 18) ── volume com os dados
```

O caminho: criar a máquina, instalar o Docker, subir um Postgres 18 na mão para entender o que
acontece, e depois subir tudo com o compose.

> **Servidor preparado antes da aula?** Se a EC2 já tem o Docker instalado e o `banco` (vazio) e
> o `adminer-aula` rodando, as partes 3.1 a 3.4 viram explicação: mostre a instância e o Security Group no console
> e, no servidor, `docker --version`, `docker ps` e `free -h` (o swap). Execute ao vivo a partir
> da 3.5. Nesse caso:
>
> - o `docker compose up -d banco` da 3.5 responde que o banco já está rodando: o compose
>   reconhece o container pelo nome do projeto (`name: aula` no compose.yaml);
> - para repetir o `docker run` da 3.4 ao vivo, troque para `-p 5433:5432`, porque a 5432 já
>   está com o `banco`;
> - o build do backend sai em segundos, porque as camadas ficaram no cache do Docker. Para
>   mostrar o build completo, rode `docker builder prune -af` antes (leva uns 2 minutos).

### 3.1 Criar a EC2

No console da AWS: **EC2 → Instances → Launch instances**.

| Campo | O que escolher |
|---|---|
| **Name** | `aula-modelagem` |
| **Application and OS Images** | **Ubuntu** → *Ubuntu Server 24.04 LTS* ou *26.04 LTS*, arquitetura 64-bit (x86) |
| **Instance type** | `t3.small` (2 GB de RAM). Uma `t3.micro` (1 GB) também serve, mas precisa de swap (passo 3.3) |
| **Key pair (login)** | **Create new key pair** → nome `aula-modelagem`, tipo RSA, formato `.pem`. O download acontece uma vez só: guarde o arquivo |
| **Network settings** | **Edit** → *Create security group* com o nome `aula-modelagem-sg` e as regras da tabela abaixo |
| **Configure storage** | **20 GiB** gp3. Os 8 GiB padrão ficam apertados com as imagens Docker |

Regras de entrada do Security Group:

| Tipo | Porta | Origem | Para quê |
|---|---|---|---|
| SSH | 22 | **My IP** | você entrar no servidor |
| Custom TCP | 3000 | **Anywhere** (0.0.0.0/0) | a turma abrir o sistema |
| Custom TCP | 8081 | **My IP** | o Adminer, para ver o banco pelo navegador |

Vale comentar: o Security Group é o firewall da instância, e cada porta aberta é uma decisão. A
5432 fica **fechada**: quem precisa ver o banco usa o Adminer, só do seu IP, ou o `psql` de dentro
do servidor. Banco exposto na internet com senha fraca é invadido em questão de horas.

Clique em **Launch instance**. Quando a instância estiver em **Running**, copie o **Public IPv4
address**.

### 3.2 Entrar no servidor

Na pasta onde o `.pem` foi baixado:

```bash
chmod 400 aula-modelagem.pem                # o ssh recusa chave que outros usuários conseguem ler
ssh -i aula-modelagem.pem ubuntu@IP-PUBLICO
```

No Windows, rode o `ssh` no PowerShell (o `chmod` não é necessário lá). O usuário das imagens
Ubuntu é sempre `ubuntu`.

O botão **Connect → EC2 Instance Connect** do console abre um terminal no navegador, mas só
funciona se a regra de SSH aceitar os IPs da própria AWS. Com a regra em *My IP*, ele é bloqueado.

### 3.3 Instalar o Docker

```bash
curl -fsSL https://get.docker.com | sudo sh     # script oficial: Docker Engine + Docker Compose
sudo usermod -aG docker $USER                    # deixa usar o docker sem sudo
exit                                             # sai do servidor: o grupo novo vale no próximo login
```

Entre de novo com o mesmo `ssh` e confira:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

O `hello-world` mostra o ciclo inteiro: baixou uma **imagem** do Docker Hub, criou um
**container** a partir dela, rodou e apagou.

Só se escolheu a `t3.micro`, crie 1 GB de swap antes de qualquer build (com ele, o build cabe
numa máquina de 1 GB de RAM):

```bash
sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab     # continua ativo depois de um reboot
free -h                                          # a linha Swap tem que mostrar 1.0Gi
```

<details>
<summary>Instalação pelo repositório apt (o jeito que a documentação do Docker recomenda para produção)</summary>

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

O script do passo anterior faz exatamente isso, de forma automática.
</details>

### 3.4 Um Postgres 18 na mão

Antes do compose, vale subir o banco com um `docker run` só, para a turma ver cada peça:

```bash
docker run -d --name pg-teste \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=aula123 \
  -e POSTGRES_DB=aula \
  -p 5432:5432 \
  -v pg-teste:/var/lib/postgresql \
  postgres:18
```

| Trecho | O que faz |
|---|---|
| `-d` | roda em segundo plano |
| `--name pg-teste` | dá um nome ao container |
| `-e ...` | variáveis que a imagem usa **na primeira inicialização** para criar o usuário, a senha e o banco |
| `-p 5432:5432` | porta do servidor : porta dentro do container |
| `-v pg-teste:/var/lib/postgresql` | **volume**: os dados ficam fora do container e sobrevivem a ele |
| `postgres:18` | a imagem oficial do Postgres, versão 18 |

Pegadinha do Postgres 18: até o 17 o volume ia em `/var/lib/postgresql/data`. Quem copiar um
tutorial antigo vai ver o container do 18 se recusar a subir, com uma mensagem explicando o
caminho novo.

```bash
docker ps                                  # está de pé?
docker logs pg-teste                       # procure "database system is ready to accept connections"
docker exec -it pg-teste psql -U app -d aula
```

```sql
SELECT version();
\l      -- os bancos que existem
\dt     -- as tabelas: "Did not find any tables." O banco está vazio.
\q
```

Para provar que o volume guarda os dados (opcional, mas rápido):

```bash
docker exec pg-teste psql -U app -d aula -c "CREATE TABLE teste (id INT)"
docker rm -f pg-teste                      # apaga o container
# rode de novo o mesmo docker run lá de cima (seta para cima no terminal)
docker exec pg-teste psql -U app -d aula -c "\dt"     # a tabela teste continua lá
```

Para terminar, apague o teste, o que também libera a porta 5432 para o compose:

```bash
docker rm -f pg-teste && docker volume rm pg-teste
```

### 3.5 O mesmo com o compose, e o backend junto

```bash
git clone https://github.com/Rodrigo-Vieira-Chaves/aula-servidores.git
cd aula-servidores
cat compose.yaml
```

Mostre que o serviço `banco` é o mesmo `docker run` de antes, só que escrito em YAML (`image`,
`environment`, `ports`, `volumes`), com um `healthcheck` a mais. O compose transforma o comando
num arquivo versionado.

Suba **só o banco** primeiro:

```bash
docker compose up -d banco
docker compose ps                                     # espere o banco aparecer como (healthy)
docker compose exec banco psql -U app -d aula -c '\dt'
```

O banco está vazio ("Did not find any tables."). Agora o backend:

```bash
docker compose up -d --build backend        # o primeiro build leva de 1 a 3 minutos
docker compose logs -f backend
```

Enquanto o build roda, abra o [Dockerfile](backend/Dockerfile) e explique: instala as
dependências, gera o client do Prisma e compila o TypeScript.

Nos logs, aparece a ordem em que as coisas acontecem:

1. `Applying migration 20261023120000_init`: a migration cria as tabelas;
2. `seed concluido: 5 clientes, ...`: o seed insere os dados da aula;
3. `backend escutando na porta 3000`: a API está no ar.

`Ctrl+C` sai dos logs, e o container continua rodando. Volte ao banco:

```bash
docker compose exec banco psql -U app -d aula -c '\dt'
```

Agora existem as 6 tabelas do modelo e mais a `_prisma_migrations`, onde o Prisma anota quais
migrations já rodaram neste banco. Quem criou as tabelas foi a migration, não alguém digitando
`CREATE TABLE`.

### 3.6 Abrir o sistema

Acesse `http://IP-PUBLICO:3000` e passe o endereço para a turma. O selo verde no topo mostra
**PostgreSQL 18.x · banco:5432**: é o backend dizendo em que banco está conectado.

O botão **Abrir o sistema**, no topo, leva para `/atendimento/`: a tela de um atendente usando o
sistema (fila, assumir, fechar, avaliar, abrir ticket). É um bom jeito de mostrar, logo no começo,
o sistema que vai ser modelado. Mexer nos dados ali muda as contagens das consultas, então rode
`docker compose exec backend npm run seed:reset` antes das telas de consulta.

Se não abrir:

- `docker compose ps`: os containers estão `Up`, com o `banco` e o `backend` em `(healthy)`?
- `docker compose logs backend`: tem algum erro?
- O Security Group tem a regra da porta 3000?
- O endereço é `http://`, e não `https://`?

### 3.7 psql ao vivo

Deixe um terminal aberto com o banco para usar durante o resto da aula:

```bash
docker compose exec banco psql -U app -d aula
```

```sql
\dt
\d tickets
SELECT * FROM tickets;
```

O `\d tickets` mostra colunas, índices e FKs: é a modelagem vista de dentro do banco. Num segundo
terminal, deixe rodando o `docker compose logs -f backend` para a parte 7.

O mesmo banco pelo navegador: **Adminer** em `http://IP-PUBLICO:8081`, com o servidor `banco`
(já vem preenchido), o usuário `app`, a senha `aula123` e a base `aula`. Em cada tabela, a aba de
estrutura mostra as FKs e os índices, e o link "SQL command" roda qualquer consulta da aula. Ele
alcança o banco pela rede interna do Docker, por isso a 5432 não precisa estar aberta.

### Variante: banco em servidor separado

É o cenário de produção. Se der tempo, faça ao vivo:

1. Segunda EC2 só para o banco: `docker compose up -d banco`.
2. No Security Group do banco, libere a 5432 **apenas para o Security Group do backend**.
3. No servidor do backend: `DB_HOST=<ip privado do banco> docker compose up -d --build --no-deps backend`.
4. O selo no topo passa a mostrar o IP privado do banco.

Se aparecer `P1001: Can't reach database server`, é Security Group ou IP errado. Vale deixar
acontecer de propósito uma vez: é o erro mais comum de quem sobe banco na nuvem.

Comente que existe o **RDS**: o banco gerenciado da AWS, com backup, atualização e réplica
prontos. Rodar o Postgres em container é ótimo para aprender e para ambientes pequenos; em
produção, o normal é usar o banco gerenciado.

### Depois da aula

A instância cobra enquanto existir. No console: **EC2 → Instances →** selecione `aula-modelagem`
**→ Instance state → Terminate (delete) instance**. O disco vai junto. Se quiser deixar tudo
limpo, apague também o key pair e o security group `aula-modelagem-sg`.

## 4. Tour pelo modelo (telas 1 a 4)

**Tela 1: Diagrama e tabelas.** Compare o diagrama com o que foi desenhado na lousa. Passe o
mouse num ticket: acendem o cliente, o atendente, a avaliação e as tags dele. É a FK "puxando" as
linhas ligadas.

**Telas 2 a 4: 1:N, 1:1 e N:M.** Cada uma tem a mesma estrutura: a frase da relação, o diagrama,
"como se faz", a mesma tabela em SQL e no Prisma, os dados e o JOIN que liga as tabelas.

- **1:N**: aponte a coluna `cliente_id` destacada. No resultado, Fernanda aparece duas vezes
  (dois tickets) e Igor não aparece (não abriu nenhum).
- **1:1**: sem o UNIQUE, viraria 1:N. O ticket 4 está fechado e sem avaliação: o lado da
  avaliação é 0..1.
- **N:M**: passe o mouse numa linha de `tickets_tags` para acender o ticket e a tag. A consulta
  tem dois JOINs porque passa pela tabela do meio.

## 5. Constraints na prática (tela 5)

Comece pelo quadro do topo: é o próprio Postgres listando as regras que ele garante (lido do
`pg_constraint`).

Para cada experimento, **pergunte antes de clicar**: "o banco vai aceitar?".

- **DEFAULT**: o INSERT não informa status nem data, e o banco completa. Clique duas vezes e
  repare que o id **pula** (8, 9...): a sequence não volta no ROLLBACK.
- **NOT NULL, UNIQUE, CHECK, ENUM**: regras de coluna. Mostre o código SQLSTATE e o nome da
  constraint na resposta: é com eles que um backend transforma o erro do banco numa mensagem
  amigável ("e-mail já cadastrado").
- **FOREIGN KEY**: não existe cliente 999, e o ticket órfão não nasce.
- **UNIQUE na FK**: segunda avaliação para o mesmo ticket. É a 1:1 sendo garantida.
- **PK composta**: a mesma tag duas vezes no mesmo ticket.
- **RESTRICT, SET NULL e CASCADE**: a mesma operação (apagar) com três comportamentos. Cada um
  foi uma **decisão de modelagem**:
  - cliente com histórico não some (RESTRICT);
  - atendente que sai devolve os tickets para a fila (SET NULL);
  - ticket apagado leva junto avaliação e tags, que não fazem sentido sozinhas (CASCADE).

Tudo roda numa transação com ROLLBACK, então pode clicar à vontade: os dados da aula não mudam.

Bom ponto para discutir: "só pode avaliar ticket FECHADO" **não** cabe num CHECK, porque o CHECK
só enxerga a própria linha. Uma regra assim fica na aplicação (ou num trigger). Neste sistema ela
está no [tickets.service.ts](backend/src/api/rest/tickets/tickets.service.ts).

## 6. Consultas (telas 6 a 11)

Os quatro JOINs usam **o mesmo par de tabelas e as mesmas colunas**: A = `atendentes`, B =
`tickets`. Só muda o tipo de JOIN. Antes de mostrar cada resultado, peça para a turma **prever
quantas linhas** vão sair.

| Tela | Consulta | Linhas | O que destacar |
|---|---|---|---|
| 6 | SELECT | 3 | WHERE filtra linhas, a lista do SELECT escolhe colunas, sem ORDER BY não há ordem |
| 7 | INNER JOIN | 4 | Ana aparece 2 vezes; Diego, Eduarda e a fila somem |
| 8 | LEFT JOIN | 6 | Diego e Eduarda voltam com NULL; a dica mostra o anti-join (`WHERE t.id IS NULL`) |
| 9 | RIGHT JOIN | 7 | os tickets 5, 6 e 7 aparecem sem atendente; RIGHT é um LEFT com as tabelas trocadas |
| 10 | FULL OUTER JOIN | 9 | tudo dos dois lados; o MySQL não tem, e lá se faz com UNION |
| 11 | UNION / UNION ALL | 9 / 10 | o Bruno é cliente e atendente; UNION tira o repetido, UNION ALL mantém |

- Passe o mouse numa linha do resultado para acender as linhas de A e de B que a geraram.
- O Venn mostra **quais** linhas entram, não **quantas vezes**. O INNER JOIN é a prova: a Ana
  está "na interseção", mas sai duas vezes.
- No UNION, feche com a frase da tela: **JOIN cresce para o lado (colunas), UNION cresce para
  baixo (linhas)**.

## 7. No código (tela 12)

O mesmo ticket buscado pelo Prisma com `include`. Deixe o `docker compose logs -f backend` aberto
e clique no ticket 1: o Prisma **não** faz um JOIN. Ele manda **um SELECT por relação** (seis ao
todo, contando o do próprio ticket) e monta o objeto em memória.

A mensagem: o ORM é ótimo para o dia a dia, mas só funciona porque as relações foram modeladas
direito, e quem sabe SQL consegue perceber o que ele está fazendo por baixo.

## 8. Fechamento

- Entidade vira tabela, atributo vira coluna, e toda tabela tem PK.
- 1:N põe a FK no lado N. 1:1 é FK + UNIQUE. N:M precisa de tabela associativa.
- Constraints colocam as regras no banco, que vale para qualquer um que escreva nele.
- `ON DELETE` é decisão de negócio, não detalhe técnico.
- INNER traz só o que casa. LEFT, RIGHT e FULL mantêm o que não casou, com NULL. UNION empilha.

### Para praticar

1. Adicione uma coluna `prioridade` em `tickets` que aceite só `baixa`, `media` ou `alta`.
   Resolva com CHECK e depois com ENUM. Qual a diferença?
2. Modele as **mensagens** de um ticket. Que relação é? Onde fica a FK?
3. Escreva a consulta "quantos tickets cada atendente tem, **incluindo quem tem zero**". Dica:
   LEFT JOIN + `GROUP BY`. Compare `COUNT(*)` com `COUNT(t.id)` e explique a diferença.
4. Liste os clientes que nunca abriram ticket, de dois jeitos: com LEFT JOIN e com `NOT EXISTS`.
