import { Module } from '@nestjs/common';
import { ApiModule } from '@api/api.module';

import { CoreModule } from './core/core.module';

@Module({
	imports: [ApiModule, CoreModule],
})
export class AppModule {}
