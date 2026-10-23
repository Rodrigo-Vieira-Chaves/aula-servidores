import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';

// O mesmo dado das consultas, agora pelo ORM: nada de SQL escrito a mao.
// O Prisma le as relacoes do schema.prisma e busca cada uma sozinho. Com LOG_SQL=true
// da para ver no log: nao sai um JOIN, sai um SELECT por relacao.
@Injectable()
export class TicketsRepository {
	constructor(private readonly databaseService: DatabaseService) {}

	findById(id: number) {
		return this.databaseService.ticket.findUnique({
			where: { id },
			include: {
				cliente: true,
				atendente: true,
				avaliacao: true,
				tags: { include: { tag: true } },
			},
		});
	}
}
