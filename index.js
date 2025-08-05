import { create } from 'venom-bot';
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3010;
let client = null;

const buffersMensagens = new Map();
const timersResposta = new Map();

create({
  session: 'chat-tatuagem',
  multidevice: true,
  headless: "new",
  browserArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--headless=new',
  ],
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
})
  .then((whatsappClient) => startBot(whatsappClient))
  .catch((err) => console.error('❌ Erro ao iniciar Venom:', err));

async function startBot(whatsappClient) {
  client = whatsappClient;
  console.log(`🤖 Bot iniciado! Rodando na porta ${port}`);

  client.onAnyMessage(async (message) => {
    console.log('📬 onAnyMessage:', JSON.stringify(message, null, 2));
  });

  client.onMessage(async (message) => {
    console.log('📩 onMessage:', JSON.stringify(message, null, 2));
  });

  client.onMessageReceived(async (message) => {
    console.log('📥 onMessageReceived:', JSON.stringify(message, null, 2));
  });

  client.onStateChange((state) => {
    console.log('⚙️ Estado do cliente mudou:', state);
  });

  client.onStreamChange((stream) => {
    console.log('🔄 Stream mudou:', stream);
  });
}

async function transcreverAudio(audioPath) {
  console.log('🎧 Iniciando transcrição com Whisper para:', audioPath);

  return new Promise((resolve) => {
    const absoluteAudioPath = path.resolve(audioPath);
    const txtName = path.basename(absoluteAudioPath).replace(/\.[^/.]+$/, ".txt");

    // Aqui corrigimos para buscar o txt na MESMA pasta do áudio, não na raiz
    const txtPath = path.join(path.dirname(absoluteAudioPath), txtName);

    const command = `python -m whisper "${absoluteAudioPath}" --model small --language Portuguese --output_format txt`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erro ao transcrever com Whisper:', stderr || error.message);
        return resolve(null);
      }

      console.log('🖥️ Whisper CLI output:', stdout);

      if (!fs.existsSync(txtPath)) {
        console.error('⚠️ Arquivo de transcrição não encontrado:', txtPath);
        return resolve(null);
      }

      fs.readFile(txtPath, 'utf8', (err, data) => {
        if (err) {
          console.error('❌ Erro ao ler o arquivo de transcrição:', err.message);
          return resolve(null);
        }

        const texto = data.trim();
        console.log('📝 Transcrição extraída:', texto || '[Transcrição vazia]');

        if (!texto) {
          console.warn('⚠️ O arquivo .txt está vazio. Verifique se o áudio tinha fala compreensível.');
          return resolve(null);
        }

        // Apaga o arquivo txt após ler
        fs.unlink(txtPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Erro ao deletar arquivo de transcrição:', unlinkErr);
          } else {
            console.log(`🗑️ Arquivo de transcrição deletado: ${txtPath}`);
          }
        });

        resolve(texto);
      });
    });
  });
}

async function enviarParaIALocal(pergunta) {
  try {
    console.log(`🧠 Enviando pergunta para IA local: "${pergunta}"`);

    const prompt = `
Você é a secretária virtual do Estúdio de Tatuagem Daniel Araujo.

Seu papel:
- Responda apenas o que foi perguntado, de forma muito direta, objetiva e curta (uma ou duas frases no máximo), evitando qualquer informação adicional.
- Seja educada e simpática, mas sem enrolação.
- Pode ser extremamente informal, usar gírias e tentar seguir a conversa no mesmo tom que o cliente.
- Informar sobre promoções, estilos de tatuagem, cuidados, preços e agendamentos.
- Incentivar o envio de referências de arte.
- Nunca responda sobre assuntos fora do estúdio (política, medicina, etc.).
- Utilize linguagem acessível e sem termos técnicos complexos.

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

app.get('/', (req, res) => res.send('Painel do chatbot será criado aqui!'));
app.listen(port);
