import { Module } from '@nestjs/common';

import { WsModule } from './ws/ws.module';
import { RestModule } from './rest/rest.module';

@Module({
	imports: [RestModule, WsModule],
})
export class ApiModule {}
