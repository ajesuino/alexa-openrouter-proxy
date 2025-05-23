const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.post('/perguntar', async (req, res) => {
  const pergunta = req.body.pergunta;
  if (!pergunta) return res.status(400).json({ erro: 'pergunta obrigatória' });

  try {
    const resposta = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: pergunta }]
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ resposta: resposta.data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/', (_, res) => res.send('Servidor da IA está online.'));
app.listen(process.env.PORT || 3000, () => console.log('✅ Servidor rodando'));
