import { Injectable } from '@nestjs/common';
import { StatusTicket } from '@core/prisma';
import { DatabaseService } from '@core/database/database.service';

// Tudo pelo ORM: nada de SQL escrito a mao. O Prisma le as relacoes do schema.prisma
// e busca cada uma sozinho. Com LOG_SQL=true da para ver no log: nao sai um JOIN,
// sai um SELECT por relacao.
const COM_RELACOES = {
	cliente: true,
	atendente: true,
	avaliacao: true,
	tags: { include: { tag: true } },
} as const;

@Injectable()
export class TicketsRepository {
	constructor(private readonly databaseService: DatabaseService) {}

	findAll() {
		return this.databaseService.ticket.findMany({ include: COM_RELACOES, orderBy: { id: 'desc' } });
	}

	findById(id: number) {
		return this.databaseService.ticket.findUnique({ where: { id }, include: COM_RELACOES });
	}

	// Cria o ticket e, na mesma operacao, as linhas da tabela associativa tickets_tags.
	create(data: { titulo: string; clienteId: number; tagIds: number[] }) {
		return this.databaseService.ticket.create({
			data: {
				titulo: data.titulo,
				clienteId: data.clienteId,
				tags: { create: data.tagIds.map((tagId) => ({ tagId })) },
			},
		});
	}

	update(id: number, data: { atendenteId?: number | null; status?: StatusTicket }) {
		return this.databaseService.ticket.update({ where: { id }, data });
	}

	createAvaliacao(data: { ticketId: number; nota: number; comentario: string | null }) {
		return this.databaseService.avaliacao.create({ data });
	}
}
