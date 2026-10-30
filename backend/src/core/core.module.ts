import { Module } from '@nestjs/common';

import { ConexoesModule } from './conexoes/conexoes.module';
import { HealthCheckModule } from './health-check/health-check.module';

@Module({
	imports: [ConexoesModule, HealthCheckModule],
})
export class CoreModule {}
