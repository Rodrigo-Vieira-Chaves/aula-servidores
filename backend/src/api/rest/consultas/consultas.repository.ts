import { Injectable } from '@nestjs/common';
import { Prisma } from '@core/prisma';
import { DatabaseService } from '@core/database/database.service';

// Os quatro JOINs usam o mesmo par de tabelas e as mesmas colunas:
// A = atendentes (esquerda, a do FROM) e B = tickets (direita, a do JOIN).
// So muda o tipo de JOIN, e e isso que muda o resultado.
@Injectable()
export class ConsultasRepository {
	constructor(private readonly databaseService: DatabaseService) {}

	select() {
		return this.databaseService.consultar(Prisma.sql`
			SELECT id, titulo, status, criado_em
			FROM tickets
			WHERE status = 'ABERTO'
			ORDER BY criado_em
		`);
	}

	innerJoin() {
		return this.databaseService.consultar(Prisma.sql`
			SELECT a.id AS atendente_id, a.nome AS atendente,
			       t.id AS ticket_id, t.titulo
			FROM atendentes a
			INNER JOIN tickets t ON t.atendente_id = a.id
			ORDER BY a.id, t.id
		`);
	}

	leftJoin() {
		return this.databaseService.consultar(Prisma.sql`
			SELECT a.id AS atendente_id, a.nome AS atendente,
			       t.id AS ticket_id, t.titulo
			FROM atendentes a
			LEFT JOIN tickets t ON t.atendente_id = a.id
			ORDER BY a.id, t.id
		`);
	}

	rightJoin() {
		return this.databaseService.consultar(Prisma.sql`
			SELECT a.id AS atendente_id, a.nome AS atendente,
			       t.id AS ticket_id, t.titulo
			FROM atendentes a
			RIGHT JOIN tickets t ON t.atendente_id = a.id
			ORDER BY a.id, t.id
		`);
	}

	fullOuterJoin() {
		return this.databaseService.consultar(Prisma.sql`
			SELECT a.id AS atendente_id, a.nome AS atendente,
			       t.id AS ticket_id, t.titulo
			FROM atendentes a
			FULL OUTER JOIN tickets t ON t.atendente_id = a.id
			ORDER BY a.id, t.id
		`);
	}

	// UNION empilha linhas: os dois SELECTs precisam ter as mesmas colunas.
	union() {
		return this.databaseService.consultar(Prisma.sql`
			SELECT nome, email FROM clientes
			UNION
			SELECT nome, email FROM atendentes
			ORDER BY nome
		`);
	}

	unionAll() {
		return this.databaseService.consultar(Prisma.sql`
			SELECT nome, email FROM clientes
			UNION ALL
			SELECT nome, email FROM atendentes
			ORDER BY nome
		`);
	}
}
