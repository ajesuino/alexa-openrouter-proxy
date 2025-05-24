const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');

const app = express();
app.use(bodyParser.json());

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

// Rota principal para uso via API (Postman ou outro app)
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

// Rota de UI amigável para navegador
app.get('/ui', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Ciborgue Azul - IA</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; background: #f8f9fa; color: #333; }
        h1 { color: #0055aa; }
        input, button { padding: 10px; font-size: 16px; }
        input { width: 80%; }
        #resposta { margin-top: 20px; padding: 15px; border: 1px solid #ccc; background: #fff; }
      </style>
    </head>
    <body>
      <h1>🤖 Ciborgue Azul</h1>
      <p>Digite sua pergunta abaixo:</p>
      <input id="pergunta" placeholder="Ex: Quem descobriu a penicilina?" />
      <button onclick="fazerPergunta()">Perguntar</button>

      <div id="resposta"></div>

      <script>
        async function fazerPergunta() {
          const texto = document.getElementById('pergunta').value;
          const respostaEl = document.getElementById('resposta');
          respostaEl.innerHTML = '⏳ Processando...';
          try {
            const resp = await fetch('/ciborgue/perguntar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pergunta: texto })
            });
            const data = await resp.json();
            respostaEl.innerHTML = '<b>Resposta:</b><br>' + (data.resposta || 'Sem resposta');
          } catch (err) {
            respostaEl.innerHTML = '❌ Erro ao consultar IA';
          }
        }
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

// Função que chama a OpenRouter API
async function chamarIAOpenRouter(pergunta) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'gpt-3.5-turbo',
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

// Dashboard simples
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

// Página inicial
app.get('/', (req, res) => {
  res.send('🔵 Ciborgue Azul (Proxy OpenRouter) está online.');
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
