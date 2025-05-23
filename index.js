const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Trata requisições da Alexa
app.post('/alexa', async (req, res) => {
  const requestType = req.body.request?.type;
  const intentName = req.body.request?.intent?.name;
  const slotValue = req.body.request?.intent?.slots?.texto?.value || '';

  if (requestType === 'LaunchRequest') {
    return res.json(buildResponse("Bem-vindo à sua inteligência artificial. Pode perguntar qualquer coisa agora."));
  }

  if (requestType === 'IntentRequest' && intentName === 'PerguntarIAIntent') {
    try {
      const resposta = await chamarServidorIA(slotValue);
      return res.json(buildResponse(resposta));
    } catch (e) {
      return res.json(buildResponse("Erro ao acessar a inteligência artificial: " + e.message));
    }
  }

  return res.json(buildResponse("Desculpe, não entendi a solicitação."));
});

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

// Função para chamar o OpenRouter via seu proxy atual
function chamarServidorIA(pergunta) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ pergunta });

    const options = {
      hostname: 'alexa-openrouter-proxy.onrender.com',
      path: '/perguntar',
      method: 'POST',
      headers: {
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
          resolve(parsed.resposta || 'A IA não respondeu.');
        } catch (e) {
          reject(new Error('Resposta inválida da IA'));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

// Rota simples para verificar status
app.get('/', (req, res) => {
  res.send('Servidor da IA está online.');
});

app.listen(PORT, () => {
  console.log(`✅ Servidor escutando na porta ${PORT}`);
});
