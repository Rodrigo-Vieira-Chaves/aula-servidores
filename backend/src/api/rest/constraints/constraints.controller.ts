import { Controller, Get, HttpCode, NotFoundException, Param, Post } from '@nestjs/common';

import { ConstraintsRepository } from './constraints.repository';

@Controller('constraints')
export class ConstraintsController {
	constructor(private readonly constraintsRepository: ConstraintsRepository) {}

	@Get()
	catalogo() {
		return this.constraintsRepository.catalogo();
	}

	@Get('experimentos')
	listarExperimentos() {
		return this.constraintsRepository.listarExperimentos();
	}

	@Post('experimentos/:id')
	@HttpCode(200)
	async executar(@Param('id') id: string) {
		const resultado = await this.constraintsRepository.executar(id);

		if (!resultado) {
			throw new NotFoundException(`experimento "${id}" nao existe`);
		}

		return resultado;
	}
}
