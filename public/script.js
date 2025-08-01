const socket = io();
const painel = document.getElementById('painel');

socket.on('atualizar', (dados) => {
  painel.innerHTML = '';
  for (const numero in dados) {
    const c = dados[numero];
    const div = document.createElement('div');
    div.className = `cliente ${c.status} ${c.atendente}`;
    div.innerHTML = `
      <h5>${c.nome} (${numero})</h5>
      <p>Status: 
        <select onchange="alterarStatus('${numero}', this.value)">
          <option ${c.status === 'conversando' ? 'selected' : ''}>conversando</option>
          <option ${c.status === 'agendado' ? 'selected' : ''}>agendado</option>
          <option ${c.status === 'atendido' ? 'selected' : ''}>atendido</option>
        </select>
      </p>
      <p>Atendente: 
        <select onchange="alterarAtendente('${numero}', this.value)">
          <option ${c.atendente === 'Chatbot' ? 'selected' : ''}>Chatbot</option>
          <option ${c.atendente === 'Daniel' ? 'selected' : ''}>Daniel</option>
        </select>
      </p>
      <p>
        <button onclick="iniciarFluxo('${numero}')">Iniciar fluxo de teste</button>
        <button onclick="enviarMensagem('${numero}')">Enviar mensagem</button>
        <button onclick="mostrarHistorico('${numero}')">Ver histórico</button>
      </p>
    `;
    painel.appendChild(div);
  }
});

function alterarStatus(numero, status) {
  socket.emit('alterarStatus', { numero, status });
}

function alterarAtendente(numero, atendente) {
  socket.emit('alterarAtendente', { numero, atendente });
}

function iniciarFluxo(numero) {
  socket.emit('iniciarFluxo', { numero });
}

function enviarMensagem(numero) {
  const mensagem = prompt('Digite a mensagem:');
  if (mensagem) socket.emit('enviarMensagem', { numero, mensagem });
}

function mostrarHistorico(numero) {
  const historico = prompt('Exibir histórico direto no painel ainda será implementado. OK');
}
