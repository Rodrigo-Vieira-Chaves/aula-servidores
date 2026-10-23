import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';

@Injectable()
export class CadastrosRepository {
	constructor(private readonly databaseService: DatabaseService) {}

	// O que a tela do atendente precisa para preencher os campos de escolha.
	async findAll() {
		const [clientes, atendentes, tags] = await Promise.all([
			this.databaseService.cliente.findMany({ orderBy: { nome: 'asc' } }),
			this.databaseService.atendente.findMany({ orderBy: { nome: 'asc' } }),
			this.databaseService.tag.findMany({ orderBy: { nome: 'asc' } }),
		]);

		return { clientes, atendentes, tags };
	}

	findAtendente(id: number) {
		return this.databaseService.atendente.findUnique({ where: { id } });
	}
}
