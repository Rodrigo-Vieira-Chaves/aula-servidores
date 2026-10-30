import { BadRequestException, Injectable } from '@nestjs/common';
import type { WebSocket } from 'ws';
import { enviar, transmitir } from '@shared/ws/enviar';

import { ChatRepository, Mensagem } from './chat.repository';

@Injectable()
export class ChatService {
	// Quem esta com o chat aberto agora. E para essas conexoes que o broadcast vai.
	private readonly clientes = new Set<WebSocket>();

	constructor(private readonly chatRepository: ChatRepository) {}

	// Quem acabou de conectar recebe o historico, e todo mundo fica sabendo quantos estao online.
	entrar(cliente: WebSocket) {
		this.clientes.add(cliente);
		enviar(cliente, 'historico', this.chatRepository.findAll());
		transmitir(this.clientes, 'presenca', { online: this.clientes.size });
	}

	sair(cliente: WebSocket) {
		this.clientes.delete(cliente);
		transmitir(this.clientes, 'presenca', { online: this.clientes.size });
	}

	listar(depoisDe: number) {
		return this.chatRepository.findAll(depoisDe);
	}

	// Vale para as duas portas de entrada: o gateway (WebSocket) e o controller (HTTP).
	// Em qualquer caso, a mensagem sai para todos pelo WebSocket.
	publicar(autor: unknown, texto: unknown, via: Mensagem['via']) {
		const nome = typeof autor === 'string' ? autor.trim().slice(0, 24) : '';
		const conteudo = typeof texto === 'string' ? texto.trim() : '';

		if (!nome) {
			throw new BadRequestException('Informe o seu nome');
		}

		if (!conteudo) {
			throw new BadRequestException('A mensagem está vazia');
		}

		if (conteudo.length > 500) {
			throw new BadRequestException('A mensagem passa de 500 caracteres');
		}

		const mensagem = this.chatRepository.create({ autor: nome, texto: conteudo, via });

		transmitir(this.clientes, 'mensagem', mensagem);

		return mensagem;
	}
}
