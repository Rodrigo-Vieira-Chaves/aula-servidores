export const HTTP_PORT = Number(process.env.HTTP_PORT) || 3000;
// De quanto em quanto tempo o servidor manda um ping para cada conexao.
// Quem nao responder com pong ate o proximo ping caiu sem avisar e e derrubado.
export const HEARTBEAT_MS = Number(process.env.HEARTBEAT_MS) || 15000;
// Imprime no log cada mensagem que chega pelo WebSocket.
export const LOG_WS = process.env.LOG_WS === 'true';
