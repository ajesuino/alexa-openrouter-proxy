const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
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

// Endpoint principal de API para POST
app.post('/ciborgue/perguntar', async (req, res) => {
  const pergunta = req.body.pergunta || 'nada';

  try {
    const inicio = Date.now();
    const respostaIA = await chamarIAOpenRouter(pergunta);
    const fim = Date.now();

    registrarLog(pergunta, respostaIA, fim - inicio);
    res.json({ resposta: respostaIA });
  } catch (err) {
    res.status(500).json({ erro: err.message || 'erro desconhecido' });
  }
});

// Interface Web amigável (GET /ui)
app.get('/ui', (req, res) => {
  const html = `
    <html>
      <head>
        <title>Interface do Ciborgue Azul</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; max-width: 600px; }
          input, button { font-size: 16px; padding: 10px; width: 100%; margin-top: 10px; }
          #resposta { margin-top: 20px; padding: 10px; background: #eef; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>🤖 Ciborgue Azul</h1>
        <form method="POST" action="/ui">
          <input name="pergunta" placeholder="Digite sua pergunta..." required />
          <button type="submit">Perguntar</button>
        </form>
        <div id="resposta"></div>
      </body>
    </html>
  `;
  res.send(html);
});

// Recebe o form da UI (POST /ui)
app.post('/ui', async (req, res) => {
  const pergunta = req.body.pergunta || '';
  let respostaIA = '';

  try {
    const inicio = Date.now();
    respostaIA = await chamarIAOpenRouter(pergunta);
    const fim = Date.now();
    registrarLog(pergunta, respostaIA, fim - inicio);
  } catch (e) {
    respostaIA = 'Erro: ' + e.message;
  }

  const html = `
    <html>
      <head>
        <title>Interface do Ciborgue Azul</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; max-width: 600px; }
          input, button { font-size: 16px; padding: 10px; width: 100%; margin-top: 10px; }
          #resposta { margin-top: 20px; padding: 10px; background: #eef; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>🤖 Ciborgue Azul</h1>
        <form method="POST" action="/ui">
          <input name="pergunta" value="${pergunta}" placeholder="Digite sua pergunta..." required />
          <button type="submit">Perguntar</button>
        </form>
        <div id="resposta">
          <strong>Resposta:</strong> ${respostaIA}
        </div>
      </body>
    </html>
  `;
  res.send(html);
});

// Função que chama o OpenRouter API
async function chamarIAOpenRouter(pergunta) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'mistralai/mistral-7b-instruct-v0.3',
      messages: [{ role: 'user', content: pergunta }]
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const resposta = parsed.choices?.[0]?.message?.content;
          if (resposta) resolve(resposta);
          else reject(new Error('Resposta vazia da IA'));
        } catch (e) {
          reject(new Error('Resposta inválida da IA'));
        }
      });
    });

    req.on('error', e => reject(new Error('Erro de conexão com IA: ' + e.message)));
    req.write(data);
    req.end();
  });
}

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
        <h1>📊 Dashboard do Ciborgue Azul</h1>
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

// Rota base
app.get('/', (req, res) => {
  res.send('🔵 Ciborgue Azul (Proxy OpenRouter) está online.');
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
