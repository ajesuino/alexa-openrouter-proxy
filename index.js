const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const path = require('path');

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

// Compatibilidade com Alexa
app.post('/alexa', async (req, res) => {
  const requestType = req.body.request?.type;
  const intentName = req.body.request?.intent?.name;
  const slotValue = req.body.request?.intent?.slots?.texto?.value || '';

  if (requestType === 'LaunchRequest') {
    return res.json(buildResponse("Bem-vindo à sua inteligência artificial. Pode perguntar qualquer coisa agora."));
  }

  if (requestType === 'IntentRequest' && intentName === 'PerguntarIAIntent') {
    try {
      const inicio = Date.now();
      const resposta = await chamarIAOpenRouter(slotValue);
      const fim = Date.now();
      registrarLog(slotValue, resposta, fim - inicio);
      return res.json(buildResponse(resposta));
    } catch (e) {
      return res.json(buildResponse("Erro ao acessar a inteligência artificial: " + e.message));
    }
  }

  return res.json(buildResponse("Desculpe, não entendi a solicitação."));
});

// Endpoint principal via Postman ou app
app.post('/perguntar', async (req, res) => {
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

// Rota para gerar pergunta estilo quiz com IA
app.get('/quiz/pergunta', async (req, res) => {
  const prompt = `Gere uma pergunta de múltipla escolha de cultura geral. Responda neste formato JSON:
{
  "pergunta": "...",
  "alternativas": ["opção1", "opção2", "opção3", "opção4", "opção5"],
  "correta": "..."
}
As alternativas devem parecer plausíveis, e a correta deve estar incluída na lista.`;

  try {
    const inicio = Date.now();
    const resposta = await chamarIAOpenRouter(prompt);
    const fim = Date.now();
    registrarLog('Nova pergunta para quiz', resposta, fim - inicio);

    const match = resposta.match(/\{[\s\S]+\}/);
    if (!match) throw new Error("IA não retornou JSON válido.");

    const json = JSON.parse(match[0]);
    res.json(json);
  } catch (e) {
    res.status(500).json({ erro: "Erro ao gerar pergunta: " + e.message });
  }
});

// Função que chama o OpenRouter API
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

// Rota de dashboard
app.get('/dashboard', (req, res) => {
  const html = `
    <html>
      <head>
        <title>Dashboard IA</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; vertical-align: top; }
          th { background-color: #f0f0f0; }
          td { max-width: 600px; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <h1>📊 Dashboard de Uso da IA</h1>
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

// Rota de verificação simples
app.get('/', (req, res) => {
  res.send('Servidor da IA está online.');
});

// Servir HTML do Quiz
app.use('/quiz', express.static(path.join(__dirname, 'quiz')));

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
