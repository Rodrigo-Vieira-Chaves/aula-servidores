-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "status_ticket" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'FECHADO');

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atendentes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "atendentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "status" "status_ticket" NOT NULL DEFAULT 'ABERTO',
    "cliente_id" INTEGER NOT NULL,
    "atendente_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacoes" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,

    CONSTRAINT "avaliacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets_tags" (
    "ticket_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "tickets_tags_pkey" PRIMARY KEY ("ticket_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "atendentes_email_key" ON "atendentes"("email");

-- CreateIndex
CREATE INDEX "tickets_cliente_id_idx" ON "tickets"("cliente_id");

-- CreateIndex
CREATE INDEX "tickets_atendente_id_idx" ON "tickets"("atendente_id");

-- CreateIndex
CREATE UNIQUE INDEX "avaliacoes_ticket_id_key" ON "avaliacoes"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_nome_key" ON "tags"("nome");

-- CreateIndex
CREATE INDEX "tickets_tags_tag_id_idx" ON "tickets_tags"("tag_id");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_atendente_id_fkey" FOREIGN KEY ("atendente_id") REFERENCES "atendentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_tags" ADD CONSTRAINT "tickets_tags_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_tags" ADD CONSTRAINT "tickets_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddCheckConstraint (escrito a mao: o schema.prisma nao tem como declarar CHECK)
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_nota_check" CHECK ("nota" BETWEEN 1 AND 5);
