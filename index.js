import { create } from 'venom-bot';
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 3010; 
let client = null;

// Controle de clientes com IA ativada
const clientesAtivos = new Map();

// Buffer para acumular mensagens por cliente e timers para controlar envio único
const buffersMensagens = new Map();
const timersResposta = new Map();

// Perguntas frequentes (FAQ)
const faq = {
  1: '💬 Quanto custa uma tatuagem?\nNossas promoções começam em R$699, e o valor final depende do tamanho e da arte.',
  2: '💬 Como funciona a consultoria?\nOferecemos atendimento personalizado para planejar sua tatuagem dos sonhos.',
  3: '💬 Onde fica o estúdio?\nEstamos localizados na Rua Exemplo, 123, Bairro Tal, Cidade.',
  4: '💬 Quais os cuidados após fazer uma tatuagem?\nMantenha a área limpa, evite sol e piscina por 30 dias, e siga nossas recomendações.',
  5: '💬 Quais são as formas de pagamento?\nAceitamos dinheiro, cartão e PIX.',
};

// Inicia o bot Venom
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
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // ajuste se necessário
})
  .then((whatsappClient) => startBot(whatsappClient))
  .catch((err) => console.error('❌ Erro ao iniciar Venom:', err));

async function startBot(whatsappClient) {
  client = whatsappClient;
  console.log(`🤖 Bot iniciado! Rodando na porta ${port}`);

  client.onMessage(async (message) => {
    if (message.isGroupMsg || message.type !== 'chat') return;

    const from = message.from.toString();
    const texto = message.body.toLowerCase().trim();

    if (texto === 'batatadoce') {
      clientesAtivos.set(from, true);

      // Limpar buffers e timers caso existam
      buffersMensagens.delete(from);
      if (timersResposta.has(from)) {
        clearTimeout(timersResposta.get(from));
        timersResposta.delete(from);
      }

      const menu =
`🌟 Olá! Eu sou a secretária virtual do Estúdio Daniel Araujo.
Posso te ajudar com dúvidas, informações e orçamentos.

Digite o número da pergunta que deseja saber:

1 - Quanto custa uma tatuagem?
2 - Como funciona a consultoria?
3 - Onde fica o estúdio?
4 - Quais os cuidados após fazer uma tatuagem?
5 - Quais são as formas de pagamento?

🧠 Se preferir, escreva sua pergunta que eu respondo com a ajuda da nossa IA!
❌ Para sair do atendimento, digite "sair".`;

      await client.sendText(from, menu);
      return;
    }

    if (texto === 'sair') {
      clientesAtivos.delete(from);

      // Limpar buffers e timers caso existam
      buffersMensagens.delete(from);
      if (timersResposta.has(from)) {
        clearTimeout(timersResposta.get(from));
        timersResposta.delete(from);
      }

      await client.sendText(from, '🚪 Atendimento encerrado. Quando quiser voltar, é só digitar "batatadoce".');
      return;
    }

    if (clientesAtivos.get(from)) {
      if (faq[texto]) {
        await client.sendText(from, faq[texto]);
        return;
      }

      // Acumular mensagens no buffer do cliente
      if (!buffersMensagens.has(from)) {
        buffersMensagens.set(from, []);
      }
      buffersMensagens.get(from).push(message.body.trim());

      // Limpar timer anterior para reiniciar contagem
      if (timersResposta.has(from)) {
        clearTimeout(timersResposta.get(from));
      }

      // Definir novo timer para enviar a resposta após 10 segundos de "silêncio"
      const timeout = setTimeout(async () => {
        const mensagensConcatenadas = buffersMensagens.get(from).join(' ');
        buffersMensagens.delete(from);
        timersResposta.delete(from);

        const resposta = await enviarParaIALocal(mensagensConcatenadas);
        await client.sendText(from, resposta);
      }, 10000); // 10 segundos

      timersResposta.set(from, timeout);
    }
  });
}

// Consulta IA local (Ollama)
async function enviarParaIALocal(pergunta) {
  try {
    console.log(`🧠 Enviando pergunta para IA local: "${pergunta}"`);

    const prompt = `
Você é a secretária virtual do Estúdio de Tatuagem Daniel Araujo.

Seu papel:
- Seja objetiva e responda apenas ao que foi perguntado, de forma educada e clara, sem rodeios.
- Ser educada, clara e simpática
- Pode ser extremamente informal, usar gírias e tentar seguir a conversa no mesmo tom que o cliente.
- Informar sobre promoções, estilos de tatuagem, cuidados, preços e agendamentos
- Incentivar o envio de referências de arte
- Nunca responda sobre assuntos fora do estúdio (política, medicina, etc.)
- Utilize linguagem acessível e sem termos técnicos complexos

O Estúdio de tatuagem se chama Estúdio Daniel Araujo.
Se o cliente quiser ver meus trabalhos, sugira o instagram instagram.com/danielaraujotatuador.
O endereço é Avenida Jurema, 609, Pq Jurema, Guarulhos.
O horário de atendimento é 24h, exigindo apenas um prévio agendamento.
Qualquer agendamento exige o pagamento de um sinal no valor de R$50. Esse valor é abatido do valor total da tatuagem, o cliente só perde esse valor se não comparecer no horário agendado.
Se o cliente estiver interessado na promoção, provavelmente se trata da promoção de R$699, com as seguintes regras:

1 - Só vale para tatuagem em preto e branco
2 - Não vale para coberturas nem reformas de tatuagens.
3 - Tem que ser algo possível de se fazer em uma sessão só (ou que você esteja ciente que se precisar de mais uma sessão vai ser cobrado o mesmo valor novamente)
4 - O horário é reservado e cobramos R$50 de sinal, esse valor é abatido no pagamento da tatuagem, você só perde se faltar.
5 - Temos também anestesia por R$99 (pomada original que realmente funciona).
6 - Promoção válida para costas, braço, perna (interna ou externa) ou peitoral.

Se o cliente quiser um orçamento personalizado, diga que o tatuador irá avaliar, peça que envie referências e explique a ideia.
Se o cliente quiser agendar, diga que você irá chamar o tatuador para continuar a conversa.

Agora responda à seguinte pergunta do cliente:

"${pergunta}"
`.trim();

    console.log('⏳ Aguardando resposta da IA...');

    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'nous-hermes2',
      prompt: prompt,
      stream: false,
    });

    if (!response.data || !response.data.response) {
      console.warn('⚠️ IA respondeu vazio ou mal formatado');
      return '⚠️ A IA não conseguiu gerar uma resposta no momento. Tente novamente em instantes.';
    }

    console.log(`✅ Resposta da IA recebida: ${response.data.response.trim()}`);
    return response.data.response.trim();

  } catch (error) {
    console.error('❌ Erro ao consultar IA local:', error.message);
    return '❌ Houve um problema ao consultar a IA local. Verifique se o Ollama está rodando com o modelo correto.';
  }
}

// Painel web (opcional)
app.get('/', (req, res) => res.send('Painel do chatbot será criado aqui!'));
app.listen(port);
