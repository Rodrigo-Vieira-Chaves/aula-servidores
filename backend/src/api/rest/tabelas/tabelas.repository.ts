import { Injectable } from '@nestjs/common';
import { Prisma } from '@core/prisma';
import { DatabaseService } from '@core/database/database.service';

@Injectable()
export class TabelasRepository {
	constructor(private readonly databaseService: DatabaseService) {}

	async todas() {
		const [clientes, atendentes, tickets, avaliacoes, tags, ticketsTags] = await Promise.all([
			this.databaseService.consultar(Prisma.sql`SELECT * FROM clientes ORDER BY id`),
			this.databaseService.consultar(Prisma.sql`SELECT * FROM atendentes ORDER BY id`),
			this.databaseService.consultar(Prisma.sql`SELECT * FROM tickets ORDER BY id`),
			this.databaseService.consultar(Prisma.sql`SELECT * FROM avaliacoes ORDER BY id`),
			this.databaseService.consultar(Prisma.sql`SELECT * FROM tags ORDER BY id`),
			this.databaseService.consultar(Prisma.sql`SELECT * FROM tickets_tags ORDER BY ticket_id, tag_id`),
		]);

		return { clientes, atendentes, tickets, avaliacoes, tags, tickets_tags: ticketsTags };
	}
}
