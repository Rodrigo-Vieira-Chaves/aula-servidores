import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

// As regras ficam no service e valem para o HTTP e para o WebSocket. Os services lancam
// erros HTTP (BadRequestException); aqui eles viram o evento "exception" do WebSocket,
// com a mensagem, em vez do "Internal server error" generico.
@Catch(HttpException)
export class ErroWsFilter extends BaseWsExceptionFilter {
	catch(erro: HttpException, host: ArgumentsHost) {
		super.catch(new WsException(erro.message), host);
	}
}
