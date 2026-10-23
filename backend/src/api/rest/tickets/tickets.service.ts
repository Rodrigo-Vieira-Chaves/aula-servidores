import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusTicket } from '@core/prisma';
import { CadastrosRepository } from '@api/rest/cadastros/cadastros.repository';

import { TicketsRepository } from './tickets.repository';

// As regras de negocio que nao cabem numa constraint do banco ficam aqui.
@Injectable()
export class TicketsService {
	constructor(
		private readonly ticketsRepository: TicketsRepository,
		private readonly cadastrosRepository: CadastrosRepository,
	) {}

	listar() {
		return this.ticketsRepository.findAll();
	}

	async buscar(id: number) {
		const ticket = await this.ticketsRepository.findById(id);

		if (!ticket) {
			throw new NotFoundException(`Ticket ${id} não encontrado`);
		}

		return ticket;
	}

	async criar(titulo: string, clienteId: number, tagIds: number[]) {
		if (!titulo.trim()) {
			throw new BadRequestException('Informe o título do ticket');
		}

		if (!Number.isInteger(clienteId)) {
			throw new BadRequestException('Escolha o cliente');
		}

		// status e criado_em ficam com o DEFAULT do banco; atendente_id fica NULL (na fila).
		const ticket = await this.ticketsRepository.create({ titulo: titulo.trim(), clienteId, tagIds });

		return this.buscar(ticket.id);
	}

	async assumir(id: number, atendenteId: number) {
		const ticket = await this.buscar(id);

		if (ticket.status === StatusTicket.FECHADO) {
			throw new BadRequestException('Este ticket já está fechado');
		}

		const atendente = Number.isInteger(atendenteId) ? await this.cadastrosRepository.findAtendente(atendenteId) : null;

		if (!atendente) {
			throw new NotFoundException('Atendente não encontrado');
		}

		if (!atendente.ativo) {
			throw new BadRequestException('Atendente inativo não pode assumir tickets');
		}

		await this.ticketsRepository.update(id, { atendenteId, status: StatusTicket.EM_ANDAMENTO });

		return this.buscar(id);
	}

	async devolver(id: number) {
		const ticket = await this.buscar(id);

		if (ticket.status === StatusTicket.FECHADO) {
			throw new BadRequestException('Este ticket já está fechado');
		}

		await this.ticketsRepository.update(id, { atendenteId: null, status: StatusTicket.ABERTO });

		return this.buscar(id);
	}

	async fechar(id: number) {
		const ticket = await this.buscar(id);

		if (ticket.status === StatusTicket.FECHADO) {
			throw new BadRequestException('Este ticket já está fechado');
		}

		if (!ticket.atendenteId) {
			throw new BadRequestException('Assuma o ticket antes de fechar');
		}

		await this.ticketsRepository.update(id, { status: StatusTicket.FECHADO });

		return this.buscar(id);
	}

	// "So avalia ticket fechado" depende do status em OUTRA tabela (tickets),
	// e um CHECK so enxerga a propria linha. Por isso a regra mora aqui.
	async avaliar(id: number, nota: number, comentario: string | null) {
		const ticket = await this.buscar(id);

		if (ticket.status !== StatusTicket.FECHADO) {
			throw new BadRequestException('Só dá para avaliar um ticket fechado');
		}

		if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
			throw new BadRequestException('A nota vai de 1 a 5');
		}

		try {
			await this.ticketsRepository.createAvaliacao({ ticketId: id, nota, comentario: comentario?.trim() || null });
		} catch (erro) {
			// P2002 = violou um UNIQUE: o avaliacoes.ticket_id que faz a relacao ser 1:1.
			if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
				throw new ConflictException('Este ticket já foi avaliado');
			}

			throw erro;
		}

		return this.buscar(id);
	}
}
