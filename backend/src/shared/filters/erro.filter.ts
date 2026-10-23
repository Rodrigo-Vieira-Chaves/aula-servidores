import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@core/prisma';
import type { Response } from 'express';

// Erros inesperados (banco fora do ar, SQL invalido) voltam com o motivo,
// em vez do "Internal server error" padrao: ajuda a depurar ao vivo na aula.
@Catch()
export class ErroFilter implements ExceptionFilter {
	private readonly logger = new Logger(ErroFilter.name);

	catch(erro: unknown, host: ArgumentsHost) {
		const resposta = host.switchToHttp().getResponse<Response>();

		if (erro instanceof HttpException) {
			const corpo = erro.getResponse();

			return resposta.status(erro.getStatus()).json(typeof corpo === 'string' ? { message: corpo } : corpo);
		}

		// Uma constraint do banco recusou a operacao (FK, UNIQUE...): o pedido conflita com os dados.
		if (erro instanceof Prisma.PrismaClientKnownRequestError) {
			const motivo = erro.message.trim().split('\n').at(-1) ?? erro.message;

			this.logger.warn(`${erro.code}: ${motivo}`);
			return resposta.status(409).json({ message: motivo, codigo: erro.code });
		}

		const motivo = erro instanceof Error ? erro.message.trim() : String(erro);

		this.logger.error(motivo);
		resposta.status(500).json({ erro: 'falha ao consultar o banco', motivo });
	}
}
