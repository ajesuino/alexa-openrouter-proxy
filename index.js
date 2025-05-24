const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Endpoint principal da Alexa
app.post('/alexa', async (req, res) => {
  const requestType = req.body.request?.type;
  const intentName = req.body.request?.intent?.name;
  const slotValue = req.body.request?.intent?.slots?.texto?.value || '';

  if (requestType === 'LaunchRequest') {
    return res.json(buildResponse("Bem-vindo à sua inteligência artificial. Pode perguntar qualquer coisa agora."));
  }

  if (requestType === 'IntentRequest' && intentName === 'PerguntarIAIntent') {
    try {
      const resposta = await chamarIAOpenRouter(slotValue); // ✅ Chamada direta
      return res.json(buildResponse(resposta));
    } catch (e) {
      return res.json(buildResponse("Erro ao acessar a inteligência artificial: " + e.message));
    }
  }

  return res.json(buildResponse("Desculpe, não entendi a solicitação."));
});

// Rota para testes via Postman
app.post('/perguntar', async (req, res) => {
  const pergunta = req.body.pergunta || 'nada';

  try {
    const respostaIA = await chamarIAOpenRouter(pergunta);
    res.json({ resposta: respostaIA });
  } catch (err) {
    res.status(500).json({ erro: err.message || 'erro desconhecido' });
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

// Resposta formatada para Alexa
function buildResponse(speechText) {
  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: speechText
      },
      shouldEndSession: true
    }
  };
}

// Rota básica de verificação
app.get('/', (req, res) => {
  res.send('Servidor da IA está online.');
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
