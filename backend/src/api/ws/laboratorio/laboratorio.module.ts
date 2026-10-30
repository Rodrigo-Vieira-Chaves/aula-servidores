import { Module } from '@nestjs/common';

import { LaboratorioGateway } from './laboratorio.gateway';

@Module({
	providers: [LaboratorioGateway],
})
export class LaboratorioModule {}
