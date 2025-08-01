const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const venom = require('venom-bot');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3010;

let contatos = {}; // {numero: {nome, status, atendente, historico: []}}

// Arquivo de armazenamento local (pode trocar para banco depois)
const DB_PATH = './db/contatos.json';
if (fs.existsSync(DB_PATH)) {
  contatos = JSON.parse(fs.readFileSync(DB_PATH));
}

function salvarContatos() {
  fs.writeFileSync(DB_PATH, JSON.stringify(contatos, null, 2));
}

// ⚙️ Servindo painel
app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

// 🟢 Inicializa bot
venom.create().then((client) => {
  console.log('🤖 Bot pronto!');

  client.onMessage(async (msg) => {
    const numero = msg.from;
    if (!contatos[numero]) {
      contatos[numero] = {
        nome: msg.notifyName || numero,
        status: 'conversando',
        atendente: 'Chatbot',
        historico: []
      };
    }

    contatos[numero].historico.push({ texto: msg.body, origem: 'cliente', hora: new Date() });
    salvarContatos();
    io.emit('atualizar', contatos);

    if (contatos[numero].atendente === 'Chatbot') {
      if (msg.body.toLowerCase().includes('teste')) {
        const resposta = `Olá, ${contatos[numero].nome}, este é um teste automatizado.`;
        await client.sendText(numero, resposta);
        contatos[numero].historico.push({ texto: resposta, origem: 'bot', hora: new Date() });
        salvarContatos();
        io.emit('atualizar', contatos);
      } else {
        const padrao = "Olá, sou o assistente automático. Envie 'teste' para simular atendimento.";
        await client.sendText(numero, padrao);
        contatos[numero].historico.push({ texto: padrao, origem: 'bot', hora: new Date() });
        salvarContatos();
        io.emit('atualizar', contatos);
      }
    }
  });

  io.on('connection', (socket) => {
    socket.emit('atualizar', contatos);

    socket.on('enviarMensagem', async ({ numero, mensagem }) => {
      await client.sendText(numero, mensagem);
      contatos[numero].historico.push({ texto: mensagem, origem: 'admin', hora: new Date() });
      salvarContatos();
      io.emit('atualizar', contatos);
    });

    socket.on('alterarStatus', ({ numero, status }) => {
      contatos[numero].status = status;
      salvarContatos();
      io.emit('atualizar', contatos);
    });

    socket.on('alterarAtendente', ({ numero, atendente }) => {
      contatos[numero].atendente = atendente;
      salvarContatos();
      io.emit('atualizar', contatos);
    });

    socket.on('iniciarFluxo', async ({ numero }) => {
      const mensagem = `Olá ${contatos[numero].nome}, estou iniciando um fluxo de teste!`;
      await client.sendText(numero, mensagem);
      contatos[numero].historico.push({ texto: mensagem, origem: 'bot', hora: new Date() });
      salvarContatos();
      io.emit('atualizar', contatos);
    });
  });
});

server.listen(PORT, () => {
  console.log(`🖥️ Painel web: http://localhost:${PORT}`);
});
