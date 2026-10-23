import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';

import { TicketsRepository } from './tickets.repository';

@Controller('tickets')
export class TicketsController {
	constructor(private readonly ticketsRepository: TicketsRepository) {}

	@Get(':id')
	async findById(@Param('id', ParseIntPipe) id: number) {
		const ticket = await this.ticketsRepository.findById(id);

		if (!ticket) {
			throw new NotFoundException(`ticket ${id} nao encontrado`);
		}

		return { data: ticket };
	}
}
