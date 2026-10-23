import { Module } from '@nestjs/common';

import { ConstraintsController } from './constraints.controller';
import { ConstraintsRepository } from './constraints.repository';

@Module({
	providers: [ConstraintsRepository],
	controllers: [ConstraintsController],
})
export class ConstraintsModule {}
