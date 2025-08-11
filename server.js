// A linha mais importante: Carrega as variáveis de ambiente ANTES de tudo.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
// Agora, quando o 'db.js' for importado, as variáveis de ambiente já existirão.
const pool = require('./db');

const app = express();
const port = process.env.PORT || 5000;

// Configuração mais específica do CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://seu-app.vercel.app',
    // Adicione aqui a URL do seu frontend quando deployar
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Middleware de log para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rota de teste para verificar se a API está funcionando
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de Gestão de Tarefas funcionando!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /motoristas',
      'POST /motoristas',
      'PUT /motoristas/:id',
      'DELETE /motoristas/:id',
      'PUT /motoristas/:id/tarefa',
      'GET /caminhoes',
      'POST /caminhoes',
      'PUT /caminhoes/:id',
      'DELETE /caminhoes/:id',
      'GET /estatisticas/total_motoristas',
      'GET /estatisticas/total_caminhoes'
    ]
  });
});

// Rota de health check
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'OK',
      database: 'Connected',
      timestamp: result.rows[0].now
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      database: 'Disconnected',
      error: err.message
    });
  }
});

// --- ROTAS PARA MOTORISTAS ---

app.get('/api/motoristas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM motoristas ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro em GET /api/motoristas:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
  }
});

app.post('/api/motoristas', async (req, res) => {
    try {
        const { nome, telefone, cnh } = req.body;
        
        if (!nome || !telefone || !cnh) {
            return res.status(400).json({ error: 'Nome, telefone e CNH são obrigatórios' });
        }
        
        const newMotorista = await pool.query(
            "INSERT INTO motoristas (nome, telefone, cnh) VALUES ($1, $2, $3) RETURNING *",
            [nome, telefone, cnh]
        );
        res.status(201).json(newMotorista.rows[0]);
    } catch (err) {
        console.error('Erro em POST /api/motoristas:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.delete('/api/motoristas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("DELETE FROM motoristas WHERE id = $1 RETURNING *", [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Motorista não encontrado" });
        }
        
        res.json({ message: "Motorista apagado com sucesso." });
    } catch (err) {
        console.error('Erro em DELETE /api/motoristas/:id:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.put('/api/motoristas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, telefone, cnh } = req.body;
        
        if (!nome || !telefone || !cnh) {
            return res.status(400).json({ error: 'Nome, telefone e CNH são obrigatórios' });
        }
        
        const updateMotorista = await pool.query(
            "UPDATE motoristas SET nome = $1, telefone = $2, cnh = $3 WHERE id = $4 RETURNING *",
            [nome, telefone, cnh, id]
        );
        
        if (updateMotorista.rows.length === 0) {
            return res.status(404).json({ error: "Motorista não encontrado." });
        }
        res.json(updateMotorista.rows[0]);
    } catch (err) {
        console.error('Erro em PUT /api/motoristas/:id:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.put('/api/motoristas/:id/tarefa', async (req, res) => {
    try {
        const { id } = req.params;
        const { tarefa, caminhao_id } = req.body;

        const motoristaAtualizado = await pool.query(
            "UPDATE motoristas SET tarefa_atual = $1 WHERE id = $2 RETURNING *",
            [tarefa, id]
        );

        if (motoristaAtualizado.rows.length === 0) {
            return res.status(404).json({ error: "Motorista não encontrado." });
        }

        if (caminhao_id) {
            await pool.query(
                "UPDATE caminhoes SET status = 'em uso' WHERE id = $1",
                [caminhao_id]
            );
        }
        res.json(motoristaAtualizado.rows[0]);
    } catch (err) {
        console.error('Erro em PUT /api/motoristas/:id/tarefa:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

// --- ROTAS PARA CAMINHÕES ---

app.get('/api/caminhoes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM caminhoes ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro em GET /api/caminhoes:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.post('/api/caminhoes', async (req, res) => {
    try {
        const { placa, modelo, ano, capacidade } = req.body;
        
        if (!placa || !modelo || !ano || !capacidade) {
            return res.status(400).json({ error: 'Placa, modelo, ano e capacidade são obrigatórios' });
        }
        
        const newCaminhao = await pool.query(
            "INSERT INTO caminhoes (placa, modelo, ano, capacidade, status) VALUES ($1, $2, $3, $4, 'disponível') RETURNING *",
            [placa, modelo, ano, capacidade]
        );
        res.status(201).json(newCaminhao.rows[0]);
    } catch (err) {
        console.error('Erro em POST /api/caminhoes:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.put('/api/caminhoes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { placa, modelo, ano, capacidade, status } = req.body;
        
        if (!placa || !modelo || !ano || !capacidade) {
            return res.status(400).json({ error: 'Placa, modelo, ano e capacidade são obrigatórios' });
        }
        
        const updateCaminhao = await pool.query(
            "UPDATE caminhoes SET placa = $1, modelo = $2, ano = $3, capacidade = $4, status = $5 WHERE id = $6 RETURNING *",
            [placa, modelo, ano, capacidade, status || 'disponível', id]
        );

        if (updateCaminhao.rows.length === 0) {
            return res.status(404).json({ error: "Caminhão não encontrado." });
        }
        res.json(updateCaminhao.rows[0]);
    } catch (err) {
        console.error('Erro em PUT /api/caminhoes/:id:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.delete('/api/caminhoes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("DELETE FROM caminhoes WHERE id = $1 RETURNING *", [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Caminhão não encontrado" });
        }
        
        res.json({ message: "Caminhão apagado com sucesso." });
    } catch (err) {
        console.error('Erro em DELETE /api/caminhoes/:id:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

// --- ROTAS PARA ESTATÍSTICAS ---

app.get('/api/estatisticas/total_motoristas', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) AS total FROM motoristas');
        res.json({ total: parseInt(result.rows[0].total) || 0 });
    } catch (err) {
        console.error('Erro em GET /api/estatisticas/total_motoristas:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.get('/api/estatisticas/total_caminhoes', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) AS total FROM caminhoes');
        res.json({ total: parseInt(result.rows[0].total) || 0 });
    } catch (err) {
        console.error('Erro em GET /api/estatisticas/total_caminhoes:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

// Middleware para capturar rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/motoristas',
      'POST /api/motoristas',
      'PUT /api/motoristas/:id',
      'DELETE /api/motoristas/:id',
      'PUT /api/motoristas/:id/tarefa',
      'GET /api/caminhoes',
      'POST /api/caminhoes',
      'PUT /api/caminhoes/:id',
      'DELETE /api/caminhoes/:id',
      'GET /api/estatisticas/total_motoristas',
      'GET /api/estatisticas/total_caminhoes'
    ]
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Inicia o servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📋 Endpoints disponíveis:`);
  console.log(`   GET  /`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/motoristas`);
  console.log(`   POST /api/motoristas`);
  console.log(`   PUT  /api/motoristas/:id`);
  console.log(`   DELETE /api/motoristas/:id`);
  console.log(`   GET  /api/caminhoes`);
  console.log(`   POST /api/caminhoes`);
  console.log(`   PUT  /api/caminhoes/:id`);
  console.log(`   DELETE /api/caminhoes/:id`);
  console.log(`   GET  /api/estatisticas/total_motoristas`);
  console.log(`   GET  /api/estatisticas/total_caminhoes`);
});