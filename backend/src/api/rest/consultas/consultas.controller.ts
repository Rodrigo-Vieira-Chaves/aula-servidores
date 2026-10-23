import { Controller, Get } from '@nestjs/common';

import { ConsultasRepository } from './consultas.repository';

@Controller('consultas')
export class ConsultasController {
	constructor(private readonly consultasRepository: ConsultasRepository) {}

	@Get('select')
	select() {
		return this.consultasRepository.select();
	}

	@Get('inner-join')
	innerJoin() {
		return this.consultasRepository.innerJoin();
	}

	@Get('left-join')
	leftJoin() {
		return this.consultasRepository.leftJoin();
	}

	@Get('right-join')
	rightJoin() {
		return this.consultasRepository.rightJoin();
	}

	@Get('full-outer-join')
	fullOuterJoin() {
		return this.consultasRepository.fullOuterJoin();
	}

	@Get('union')
	union() {
		return this.consultasRepository.union();
	}

	@Get('union-all')
	unionAll() {
		return this.consultasRepository.unionAll();
	}
}
