const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// Armazena os logs das perguntas/respostas
const logs = [];

function registrarLog(pergunta, resposta, duracaoMs) {
  logs.unshift({
    pergunta,
    resposta,
    duracaoMs,
    timestamp: new Date().toLocaleString('pt-BR')
  });
  if (logs.length > 100) logs.pop();
}

// Endpoint de API para Postman ou consumo externo
app.post('/ciborgue/perguntar', async (req, res) => {
  const pergunta = req.body.pergunta || 'nada';

  try {
    const inicio = Date.now();
    const resposta = await chamarIA(pergunta);
    const fim = Date.now();

    registrarLog(pergunta, resposta, fim - inicio);
    res.json({ resposta });
  } catch (err) {
    res.status(500).json({ erro: err.message || 'erro desconhecido' });
  }
});

// Interface web amigável
app.get('/interface', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <title>Interface Ciborgue Azul</title>
    <style>
      body { font-family: Arial; padding: 20px; max-width: 700px; margin: auto; }
      h1 { color: #1d5ea8; }
      textarea { width: 100%; height: 80px; }
      button { padding: 10px 20px; margin-top: 10px; }
      .resposta { margin-top: 20px; font-weight: bold; color: #333; }
    </style>
  </head>
  <body>
    <h1>🔵 Ciborgue Azul</h1>
    <form id="form">
      <label for="pergunta">Digite sua pergunta:</label><br>
      <textarea id="pergunta" required></textarea><br>
      <button type="submit">Perguntar</button>
    </form>
    <div class="resposta" id="resposta"></div>

    <script>
      document.getElementById('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pergunta = document.getElementById('pergunta').value;
        document.getElementById('resposta').innerText = '⏳ Processando...';
        const res = await fetch('/ciborgue/perguntar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pergunta })
        });
        const data = await res.json();
        document.getElementById('resposta').innerText = data.resposta || 'Erro ao obter resposta.';
      });
    </script>
  </body>
  </html>
  `;
  res.send(html);
});

// Dashboard de uso
app.get('/dashboard', (req, res) => {
  const html = `
    <html>
      <head>
        <title>Dashboard do Ciborgue Azul</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; vertical-align: top; }
          th { background-color: #f0f0f0; }
          td { max-width: 600px; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <h1>🤖 Dashboard do Ciborgue Azul</h1>
        <p>Total de registros: ${logs.length}</p>
        <table>
          <tr>
            <th>Data</th>
            <th>Pergunta</th>
            <th>Resposta</th>
            <th>Tempo (ms)</th>
          </tr>
          ${logs.map(log => `
            <tr>
              <td>${log.timestamp}</td>
              <td>${log.pergunta}</td>
              <td>${log.resposta}</td>
              <td>${log.duracaoMs}</td>
            </tr>`).join('')}
        </table>
      </body>
    </html>
  `;
  res.send(html);
});

// Home
app.get('/', (req, res) => {
  res.send('🔵 Ciborgue Azul (Proxy OpenRouter) está online.');
});

// Chamada à API da IA (usando o mesmo padrão do Lambda)
async function chamarIA(pergunta) {
  const prompt = `Responda de forma direta e natural em apenas uma frase curta. Pergunta: ${pergunta}`;

  const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
    model: "mistralai/mistral-7b-instruct-v0.3",
    messages: [{ role: "user", content: prompt }]
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data.choices?.[0]?.message?.content || 'A IA não respondeu.';
}

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
