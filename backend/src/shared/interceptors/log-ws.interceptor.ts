import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { LOG_WS } from '@shared/env/env.variables';

// Com LOG_WS=true, cada mensagem que chega pelo WebSocket aparece no log do backend.
@Injectable()
export class LogWsInterceptor implements NestInterceptor {
	private readonly logger = new Logger('WebSocket');

	intercept(contexto: ExecutionContext, next: CallHandler) {
		if (LOG_WS && contexto.getType() === 'ws') {
			const ws = contexto.switchToWs();
			const dados = JSON.stringify(ws.getData()) ?? '';

			this.logger.log(`${contexto.getClass().name} <- ${ws.getPattern()} ${dados.slice(0, 200)}`);
		}

		return next.handle();
	}
}
