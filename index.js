const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.post('/perguntar', async (req, res) => {
  const pergunta = req.body.pergunta || 'nada';

  try {
    const respostaIA = await chamarIAOpenRouter(pergunta);
    res.json({ resposta: respostaIA });
  } catch (err) {
    res.status(500).json({ erro: err.message || 'erro desconhecido' });
  }
});

async function chamarIAOpenRouter(pergunta) {
  return new Promise((resolve, reject) => {
    const prompt = `Responda de forma natural e curta, com até uma frase. Pergunta: ${pergunta}`;
    const data = JSON.stringify({
      model: 'mistralai/mistral-7b-instruct-v0.3',
      messages: [{ role: 'user', content: prompt }]
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
          if (resposta) resolve(resposta.trim());
          else reject(new Error('Resposta vazia da IA'));
        } catch (e) {
          reject(new Error('Erro ao interpretar resposta da IA'));
        }
      });
    });

    req.on('error', e => reject(new Error('Erro na conexão com a IA: ' + e.message)));
    req.write(data);
    req.end();
  });
}

// Verificação rápida
app.get('/', (req, res) => {
  res.send('🔵 Servidor da IA ativo.');
});

app.listen(PORT, () => {
  console.log(`🚀 API disponível em http://localhost:${PORT}`);
});
