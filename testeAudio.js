import { create } from 'venom-bot';
import fs from 'fs';
import path from 'path';

async function start() {
  const client = await create({
    session: 'chat-tatuagem',
    multidevice: true,
    headless: "new",
  });

  client.onMessage(async (message) => {
    console.log('Mensagem recebida:');
    console.log('Tipo:', message.type);
    console.log('Mimetype:', message.mimetype);
    console.log('Is media:', message.isMedia);
    console.log('From:', message.from);

    if (message.isMedia) {
      try {
        const buffer = await client.decryptFile(message);
        const ext = message.mimetype ? message.mimetype.split('/')[1] : 'bin';
        const filename = path.join('./audios', `${message.from}-${Date.now()}.${ext}`);

        fs.writeFileSync(filename, buffer);
        console.log('Arquivo salvo:', filename);
      } catch (err) {
        console.error('Erro ao salvar arquivo de mídia:', err);
      }
    }
  });
}

start(); 
