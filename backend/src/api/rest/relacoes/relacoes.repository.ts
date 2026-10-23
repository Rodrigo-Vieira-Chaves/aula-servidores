import { Injectable } from '@nestjs/common';
import { Prisma } from '@core/prisma';
import { DatabaseService } from '@core/database/database.service';

// Uma consulta por tipo de relacao. Em todas, o JOIN segue a FK.
@Injectable()
export class RelacoesRepository {
	constructor(private readonly databaseService: DatabaseService) {}

	// 1:N: a FK tickets.cliente_id aponta para clientes.id.
	umParaMuitos() {
		return this.databaseService.consultar(Prisma.sql`
			SELECT c.id AS cliente_id, c.nome AS cliente,
			       t.id AS ticket_id, t.titulo
			FROM clientes c
			JOIN tickets t ON t.cliente_id = c.id
			ORDER BY c.id, t.id
		`);
	}

	// 1:1: a FK avaliacoes.ticket_id e UNIQUE, entao cada ticket aparece no maximo uma vez.
	umParaUm() {
		return this.databaseService.consultar(Prisma.sql`
			SELECT t.id AS ticket_id, t.titulo,
			       a.id AS avaliacao_id, a.nota, a.comentario
			FROM tickets t
			JOIN avaliacoes a ON a.ticket_id = t.id
			ORDER BY t.id
		`);
	}

	// N:M: dois JOINs, passando pela tabela associativa.
	muitosParaMuitos() {
		return this.databaseService.consultar(Prisma.sql`
			SELECT t.id AS ticket_id, t.titulo,
			       tg.id AS tag_id, tg.nome AS tag
			FROM tickets t
			JOIN tickets_tags tt ON tt.ticket_id = t.id
			JOIN tags tg ON tg.id = tt.tag_id
			ORDER BY t.id, tg.id
		`);
	}
}
