import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { NestExpressApplication } from '@nestjs/platform-express';
import { HTTP_PORT } from '@shared/env/env.variables';
import { LogWsInterceptor } from '@shared/interceptors/log-ws.interceptor';

import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);

	app.setGlobalPrefix('api', { exclude: ['health-check'] });

	// WebSocket "puro" (biblioteca ws), na mesma porta do HTTP: a conexao comeca como
	// uma requisicao HTTP e vira WebSocket no handshake. O Socket.IO poria um protocolo
	// proprio por cima, e o navegador precisaria da biblioteca dele para conversar.
	app.useWebSocketAdapter(new WsAdapter(app));
	app.useGlobalInterceptors(new LogWsInterceptor());

	// O frontend e HTML estatico: o proprio backend serve, sem Nginx.
	app.useStaticAssets(join(__dirname, '..', '..', 'frontend'));

	app.enableShutdownHooks();

	await app.listen(HTTP_PORT, '0.0.0.0');
	new Logger('Bootstrap').log(`backend escutando na porta ${HTTP_PORT} (HTTP e WebSocket)`);
}

bootstrap();
