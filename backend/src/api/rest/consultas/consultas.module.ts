import { Module } from '@nestjs/common';

import { ConsultasController } from './consultas.controller';
import { ConsultasRepository } from './consultas.repository';

@Module({
	providers: [ConsultasRepository],
	controllers: [ConsultasController],
})
export class ConsultasModule {}
