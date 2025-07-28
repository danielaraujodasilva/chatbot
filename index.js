import { create } from 'venom-bot';
import express from 'express';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Inicia cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let client = null;

// Controle de clientes com IA ativada
const clientesAtivos = new Map();

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
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Ajuste se necessário
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

    // Ativar IA com palavra-chave
    if (texto === 'batatadoce') {
      clientesAtivos.set(from, true);

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

    // Desativar IA
    if (texto === 'sair') {
      clientesAtivos.delete(from);
      await client.sendText(from, '🚪 Atendimento encerrado. Quando quiser voltar, é só digitar "batatadoce".');
      return;
    }

    // Atendimento com IA
    if (clientesAtivos.get(from)) {
      if (faq[texto]) {
        await client.sendText(from, faq[texto]);
        return;
      }

      const resposta = await enviarParaIA(message.body);
      await client.sendText(from, resposta);
    }
  });
}

// Consulta IA com instruções da secretária do estúdio
async function enviarParaIA(pergunta) {
  try {
    const resposta = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `
Você é a secretária virtual do Estúdio de Tatuagem Daniel Araujo.

Seu papel:
- Ser educada, clara e simpática
- Pode ser extremamente informal, usar gírias e tentar seguir a conversa no mesmo tom que o cliente.
- Informar sobre promoções, estilos de tatuagem, cuidados, preços e agendamentos
- Incentivar o envio de referências de arte
- Nunca responda sobre assuntos fora do estúdio (política, medicina, etc.)
- Utilize linguagem acessível e sem termos técnicos complexos

O Estúdio de tatuagem se chama Estúdio Daniel Araujo.
Se o cliente quiser ver meus trabalhos, sugira o instagram instagram.com/danielaraujotatuador .
O endereço é Avenida Jurema, 609, Pq Jurema, Guarulhos.
O horário de atendimento é 24h, exigindo apenas um préio agendamento.
Qualquer agendamento exige o pagamento de um sinal no valor de R$50. Esse valor é abatido do valor total da tatuagem, o cliente só perde esse valor se não comparecer no horário agendado.
Se o cliente estiver interessado na promoção, provavelmente se trata da promoção de R$699, vou descrever as regras dela aqui para o cliente:

1 - só vale para tatuagem em preto e branco
2 - não vale para coberturas nem reformas de tatuagens.
3 - tem que ser algo possível de se fazer em uma sessão só (ou que você esteja ciente que se precisar de mais uma sessão vai ser cobrado o mesmo valor novamente)
4 - O horário é reservado e cobramos R$50 de sinal, aí esse valor é abatido na hora que for pagar a tatuagem, você só perde se faltar no agendamento.
5 - Temos também anestesia pra ajudar a guentar hahaha, custa R$99 por pomada! Garanto que é a original que funciona de verdade!
6 - Promoção válida pra costas, braço ou perna (interna ou externa) ou peitoral!

Aí dentro dessas regras, pode desenhar o que quiser.

Se o cliente quiser um orçamento personalizado, explique apenas eu posso dar orçamentos personalizados, mas que ele pode enviar as imagens de referência e explicar a idéia dele que você vai me chamar!
Se o cliente expressar vontade de agendar, avise que você não consegue mas que vai me chamar e eu assumo a conversa!

          `.trim()
        },
        { role: 'user', content: pergunta }
      ]
    });

    return resposta.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ Erro ao consultar IA:', error.message);

    if (error.status === 429) {
      return '⚠️ Estamos temporariamente acima do limite de uso da IA. Tente novamente em instantes.';
    }

    if (error.status === 404) {
      return '⚠️ O modelo de IA não está disponível. Verifique se sua conta OpenAI está ativa.';
    }

    return '❌ Ocorreu um erro ao tentar responder. Tente novamente em breve.';
  }
}

// Painel web (opcional)
app.get('/', (req, res) => res.send('Painel do chatbot será criado aqui!'));
app.listen(port);
