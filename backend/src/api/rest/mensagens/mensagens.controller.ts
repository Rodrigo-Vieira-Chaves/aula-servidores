import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ChatService } from '@api/ws/chat/chat.service';

// O mesmo chat, pela porta HTTP de sempre.
@Controller('mensagens')
export class MensagensController {
	constructor(private readonly chatService: ChatService) {}

	// O polling: o navegador pergunta de tempos em tempos "tem mensagem depois da N?".
	// Quase sempre a resposta e uma lista vazia.
	@Get()
	listar(@Query('depois') depois?: string) {
		return { data: this.chatService.listar(Number(depois) || 0) };
	}

	// Uma requisicao HTTP comum, mas quem esta com o chat aberto recebe pelo WebSocket.
	@Post()
	publicar(@Body() body: { autor?: unknown; texto?: unknown } | undefined) {
		return { data: this.chatService.publicar(body?.autor, body?.texto, 'http') };
	}
}
