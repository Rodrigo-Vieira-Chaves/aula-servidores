import 'dotenv/config';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { HTTP_PORT } from '@shared/env/env.variables';
import { ErroFilter } from '@shared/filters/erro.filter';

import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);

	app.setGlobalPrefix('api', { exclude: ['health-check'] });
	app.useGlobalFilters(new ErroFilter());

	// O frontend e um HTML estatico: o proprio backend serve, sem Nginx.
	app.useStaticAssets(join(__dirname, '..', '..', 'frontend'));

	app.enableShutdownHooks();

	await app.listen(HTTP_PORT, '0.0.0.0');
	new Logger('Bootstrap').log(`backend escutando na porta ${HTTP_PORT}`);
}

bootstrap();
