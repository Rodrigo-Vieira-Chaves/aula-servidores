import { Module } from '@nestjs/common';

import { TabelasController } from './tabelas.controller';
import { TabelasRepository } from './tabelas.repository';

@Module({
	providers: [TabelasRepository],
	controllers: [TabelasController],
})
export class TabelasModule {}
