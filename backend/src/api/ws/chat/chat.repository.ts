import { Injectable } from '@nestjs/common';

export type Mensagem = {
	id: number;
	autor: string;
	texto: string;
	via: 'websocket' | 'http';
	enviadaEm: string;
};

const LIMITE = 100;

// Em memoria: reiniciar o backend apaga o historico. Num sistema de verdade,
// as mensagens iriam para uma tabela no banco.
@Injectable()
export class ChatRepository {
	private readonly mensagens: Mensagem[] = [];
	private ultimoId = 0;

	findAll(depoisDe = 0) {
		return this.mensagens.filter((mensagem) => mensagem.id > depoisDe);
	}

	create(data: Omit<Mensagem, 'id' | 'enviadaEm'>) {
		const mensagem = { id: ++this.ultimoId, ...data, enviadaEm: new Date().toISOString() };

		this.mensagens.push(mensagem);

		if (this.mensagens.length > LIMITE) {
			this.mensagens.shift();
		}

		return mensagem;
	}
}
