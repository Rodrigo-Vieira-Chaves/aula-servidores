/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

// Os dados foram escolhidos para cada consulta da aula ter algo para mostrar:
// - Diego e Eduarda nao tem ticket (aparecem no LEFT JOIN com NULL)
// - os tickets 5, 6 e 7 estao na fila, sem atendente (aparecem no RIGHT JOIN)
// - Bruno Lima e atendente e tambem cliente (UNION x UNION ALL)
// - Igor nao abriu ticket e a tag "sugestao" nao foi usada
// - o ticket 4 esta fechado mas nao foi avaliado (a 1:1 e opcional)

const clientes = [
	{ id: 1, nome: 'Fernanda Costa', email: 'fernanda@email.com', criadoEm: new Date('2026-10-01T10:00:00Z') },
	{ id: 2, nome: 'Gustavo Mendes', email: 'gustavo@email.com', criadoEm: new Date('2026-10-03T15:30:00Z') },
	{ id: 3, nome: 'Helena Ribeiro', email: 'helena@email.com', criadoEm: new Date('2026-10-07T09:10:00Z') },
	{ id: 4, nome: 'Bruno Lima', email: 'bruno@email.com', criadoEm: new Date('2026-10-12T18:45:00Z') },
	{ id: 5, nome: 'Igor Santos', email: 'igor@email.com', criadoEm: new Date('2026-10-18T11:20:00Z') },
];

const atendentes = [
	{ id: 1, nome: 'Ana Souza', email: 'ana@email.com', ativo: true },
	{ id: 2, nome: 'Bruno Lima', email: 'bruno@email.com', ativo: true },
	{ id: 3, nome: 'Carla Rocha', email: 'carla@email.com', ativo: true },
	{ id: 4, nome: 'Diego Alves', email: 'diego@email.com', ativo: true },
	{ id: 5, nome: 'Eduarda Pinto', email: 'eduarda@email.com', ativo: false },
];

const tickets = [
	{ id: 1, titulo: 'Não consigo fazer login', status: 'FECHADO', clienteId: 1, atendenteId: 1, criadoEm: new Date('2026-10-20T09:15:00Z') },
	{ id: 2, titulo: 'Cobrança em duplicidade', status: 'EM_ANDAMENTO', clienteId: 2, atendenteId: 1, criadoEm: new Date('2026-10-20T10:40:00Z') },
	{ id: 3, titulo: 'Erro ao gerar boleto', status: 'FECHADO', clienteId: 2, atendenteId: 2, criadoEm: new Date('2026-10-21T08:05:00Z') },
	{ id: 4, titulo: 'Como altero meu e-mail?', status: 'FECHADO', clienteId: 3, atendenteId: 3, criadoEm: new Date('2026-10-21T14:30:00Z') },
	{ id: 5, titulo: 'App fecha sozinho', status: 'ABERTO', clienteId: 4, atendenteId: null, criadoEm: new Date('2026-10-22T11:00:00Z') },
	{ id: 6, titulo: 'Quero cancelar a assinatura', status: 'ABERTO', clienteId: 1, atendenteId: null, criadoEm: new Date('2026-10-22T16:20:00Z') },
	{ id: 7, titulo: 'Nota fiscal não chegou', status: 'ABERTO', clienteId: 3, atendenteId: null, criadoEm: new Date('2026-10-23T08:50:00Z') },
] as const;

const avaliacoes = [
	{ id: 1, ticketId: 1, nota: 5, comentario: 'Resolveu rápido' },
	{ id: 2, ticketId: 3, nota: 2, comentario: 'Demorou demais' },
];

const tags = [
	{ id: 1, nome: 'urgente' },
	{ id: 2, nome: 'financeiro' },
	{ id: 3, nome: 'acesso' },
	{ id: 4, nome: 'app' },
	{ id: 5, nome: 'sugestão' },
];

const ticketsTags = [
	{ ticketId: 1, tagId: 1 },
	{ ticketId: 1, tagId: 3 },
	{ ticketId: 2, tagId: 1 },
	{ ticketId: 2, tagId: 2 },
	{ ticketId: 3, tagId: 2 },
	{ ticketId: 5, tagId: 1 },
	{ ticketId: 5, tagId: 4 },
	{ ticketId: 6, tagId: 2 },
];

async function main() {
	const resetar = process.argv.includes('--reset');
	const total = await prisma.cliente.count();

	if (total > 0 && !resetar) {
		console.log(`banco ja tem ${total} clientes, seed ignorado (use npm run seed:reset para recriar)`);
		return;
	}

	await prisma.$transaction(async (tx) => {
		await tx.$executeRaw`TRUNCATE tickets_tags, avaliacoes, tickets, tags, atendentes, clientes RESTART IDENTITY CASCADE`;

		// A ordem importa: primeiro quem e referenciado, depois quem referencia.
		await tx.cliente.createMany({ data: clientes });
		await tx.atendente.createMany({ data: atendentes });
		await tx.ticket.createMany({ data: [...tickets] });
		await tx.avaliacao.createMany({ data: avaliacoes });
		await tx.tag.createMany({ data: tags });
		await tx.ticketTag.createMany({ data: ticketsTags });

		// Os ids foram escritos a mao, entao a sequence de cada tabela nao andou.
		// Sem isso, o proximo INSERT tentaria usar o id 1 de novo.
		for (const tabela of ['clientes', 'atendentes', 'tickets', 'avaliacoes', 'tags']) {
			await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('${tabela}', 'id'), (SELECT MAX(id) FROM ${tabela}))`);
		}
	});

	console.log(
		`seed concluido: ${clientes.length} clientes, ${atendentes.length} atendentes, ${tickets.length} tickets, ` +
			`${avaliacoes.length} avaliacoes, ${tags.length} tags, ${ticketsTags.length} tickets_tags`,
	);
}

main()
	.catch((erro) => {
		console.error('falha no seed:', erro);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
