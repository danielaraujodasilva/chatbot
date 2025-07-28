import { create } from 'venom-bot';
import express from 'express';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const port = 3000;

let client = null;

// Controle de clientes com IA ativada
const clientesAtivos = new Map();

// FAQ com opções numeradas e respostas
const faq = {
  1: 'Quanto custa uma tatuagem? Nossas promoções começam em R$699, e o valor final depende do tamanho e da arte.',
  2: 'Como funciona a consultoria? Oferecemos atendimento personalizado para planejar sua tatuagem dos sonhos.',
  3: 'Onde fica o estúdio? Estamos localizados na Rua Exemplo, 123, Bairro Tal, Cidade.',
  4: 'Quais os cuidados após fazer uma tatuagem? Mantenha a área limpa, evite sol e piscina por 30 dias, e siga nossas recomendações.',
  5: 'Quais são as formas de pagamento? Aceitamos dinheiro, cartão e PIX.',
};

// Inicializa o bot Venom
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
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // ajuste se precisar
})
  .then((whatsappClient) => startBot(whatsappClient))
  .catch((err) => console.error('Erro ao iniciar Venom:', err));

async function startBot(whatsappClient) {
  client = whatsappClient;
  console.log('🤖 Bot iniciado!');

  client.onMessage(async (message) => {
    if (message.isGroupMsg || message.type !== 'chat') return;

    const from = message.from.toString();
    const texto = message.body.toLowerCase().trim();

    // Ativar atendimento IA
    if (texto === 'batatadoce') {
      clientesAtivos.set(from, true);
      let respostaInicial = 
`Olá! Eu sou a secretária virtual do Estúdio Daniel Araujo. 
Posso ajudar com perguntas frequentes. Digite o número da pergunta que deseja saber: 

1 - Quanto custa uma tatuagem?
2 - Como funciona a consultoria?
3 - Onde fica o estúdio?
4 - Quais os cuidados após fazer uma tatuagem?
5 - Quais são as formas de pagamento?
Para sair do atendimento, digite "sair".`;

      client.sendText(from, respostaInicial);
      return;
    }

    // Desativar atendimento IA
    if (texto === 'sair') {
      clientesAtivos.delete(from);
      client.sendText(from, 'Atendimento desativado. Quando quiser, envie "batatadoce" para reativar.');
      return;
    }

    // Se IA ativada
    if (clientesAtivos.get(from)) {
      // Se cliente responder com número do FAQ
      if (faq[texto]) {
        client.sendText(from, faq[texto]);
        return;
      }

      // Senão, usa IA para responder
      const resposta = await enviarParaIA(message.body);
      client.sendText(from, resposta);
    }
  });
}

async function enviarParaIA(pergunta) {
  try {
    const resposta = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Você é uma secretária virtual do Estúdio de Tatuagem Daniel Araujo. 
Seja simpática, profissional e objetiva.
Informe sobre promoções, orçamentos, agendamentos, regras e cuidados.
Sempre responda com linguagem clara e educada.`
        },
        { role: 'user', content: pergunta },
      ],
    });

    return resposta.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erro ao consultar ChatGPT:', error.message);
    return 'Desculpe, houve um erro ao responder. Tente novamente em instantes.';
  }
}

// Servidor web para painel futuro
app.get('/', (req, res) => res.send('Painel do chatbot será criado aqui!'));
app.listen(port, () => console.log(`🌐 Painel rodando em http://localhost:${port}`));
