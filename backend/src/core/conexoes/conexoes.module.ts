import { Global, Module } from '@nestjs/common';

import { ConexoesService } from './conexoes.service';

@Global()
@Module({
	exports: [ConexoesService],
	providers: [ConexoesService],
})
export class ConexoesModule {}
