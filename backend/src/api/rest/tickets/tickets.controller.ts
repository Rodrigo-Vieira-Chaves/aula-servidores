import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';

import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
	constructor(private readonly ticketsService: TicketsService) {}

	@Get()
	async listar() {
		return { data: await this.ticketsService.listar() };
	}

	@Get(':id')
	async buscar(@Param('id', ParseIntPipe) id: number) {
		return { data: await this.ticketsService.buscar(id) };
	}

	@Post()
	async criar(@Body() body: { titulo?: string; clienteId?: number; tagIds?: number[] }) {
		const tagIds = Array.isArray(body.tagIds) ? body.tagIds.map(Number) : [];

		return { data: await this.ticketsService.criar(body.titulo ?? '', Number(body.clienteId), tagIds) };
	}

	@Patch(':id/assumir')
	async assumir(@Param('id', ParseIntPipe) id: number, @Body() body: { atendenteId?: number }) {
		return { data: await this.ticketsService.assumir(id, Number(body.atendenteId)) };
	}

	@Patch(':id/devolver')
	async devolver(@Param('id', ParseIntPipe) id: number) {
		return { data: await this.ticketsService.devolver(id) };
	}

	@Patch(':id/fechar')
	async fechar(@Param('id', ParseIntPipe) id: number) {
		return { data: await this.ticketsService.fechar(id) };
	}

	@Post(':id/avaliacao')
	async avaliar(@Param('id', ParseIntPipe) id: number, @Body() body: { nota?: number; comentario?: string }) {
		return { data: await this.ticketsService.avaliar(id, Number(body.nota), body.comentario ?? null) };
	}
}
