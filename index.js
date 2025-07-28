import { create } from 'venom-bot';
import express from 'express';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const app = express();
const port = 3000;

let client = null;

create({
  session: 'chat-tatuagem',
  multidevice: true,
  headless: true,
  browserArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--headless=new',
  ],
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' // ajuste o caminho se necessário
})
  .then((whatsappClient) => startBot(whatsappClient))
  .catch((err) => console.error(err));

async function startBot(whatsappClient) {
  client = whatsappClient;
  console.log('🤖 Bot iniciado!');

  client.onMessage(async (message) => {
    if (!message.isGroupMsg && message.type === 'chat') {
      const resposta = await enviarParaIA(message.body);
      client.sendText(message.from, resposta);
    }
  });
}

async function enviarParaIA(pergunta) {
  try {
    const resposta = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Você é uma secretária virtual de um estúdio de tatuagem. Seja simpática, clara e objetiva. Ajude com dúvidas sobre orçamentos, promoções, regras e agendamentos.'
        },
        { role: 'user', content: pergunta }
      ],
    });

    return resposta.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erro ao consultar ChatGPT:', error.message);
    return 'Desculpe, houve um erro ao responder. Tente novamente em instantes.';
  }
}

// (Opcional) Servidor web para futuro painel
app.get('/', (req, res) => res.send('Painel do chatbot será criado aqui!'));
app.listen(port, () => console.log(`🌐 Painel rodando em http://localhost:${port}`));
