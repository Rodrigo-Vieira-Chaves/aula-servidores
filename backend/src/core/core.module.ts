import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { HealthCheckModule } from './health-check/health-check.module';

@Module({
	imports: [DatabaseModule, HealthCheckModule],
})
export class CoreModule {}
