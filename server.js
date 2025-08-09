const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();

// CORS Configuração
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    'https://fastroute.netlify.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.options('*', cors());
app.use(express.json());

// Rota de teste básica
app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando!' });
});

// TAREFAS - Rotas básicas
app.get('/api/tarefas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tarefas ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar tarefas:', err);
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

app.post('/api/tarefas', async (req, res) => {
  try {
    const { codigo, cliente, endereco, tipo, equipamento, peso, data, periodo } = req.body;
    const result = await pool.query(
      'INSERT INTO tarefas (codigo, cliente, endereco, tipo, equipamento, peso, data, periodo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [codigo, cliente, endereco, tipo, equipamento, peso, data, periodo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar tarefa:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Código de tarefa já existe' });
    }
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

// Rota DELETE simplificada para teste
app.delete('/api/tarefas/*', async (req, res) => {
  try {
    const id = req.path.split('/').pop(); // Pega o ID da URL
    const result = await pool.query('DELETE FROM tarefas WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    res.json({ message: 'Tarefa excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir tarefa:', err);
    res.status(500).json({ error: 'Erro ao excluir tarefa' });
  }
});

// MOTORISTAS
app.get('/api/motoristas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM motoristas ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar motoristas:', err);
    res.status(500).json({ error: 'Erro ao buscar motoristas' });
  }
});

app.post('/api/motoristas', async (req, res) => {
  try {
    const { nome, email, telefone, cnh, categoria, status } = req.body;
    const result = await pool.query(
      'INSERT INTO motoristas (nome, email, telefone, cnh, categoria, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nome, email, telefone, cnh, categoria, status || 'Disponível']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar motorista:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email ou CNH já cadastrado' });
    }
    res.status(500).json({ error: 'Erro ao criar motorista' });
  }
});

// CAMINHÕES
app.get('/api/caminhoes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM caminhoes ORDER BY placa');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar caminhões:', err);
    res.status(500).json({ error: 'Erro ao buscar caminhões' });
  }
});

app.post('/api/caminhoes', async (req, res) => {
  try {
    const { placa, modelo, capacidade, status } = req.body;
    const result = await pool.query(
      'INSERT INTO caminhoes (placa, modelo, capacidade, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [placa, modelo, capacidade, status || 'Disponível']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar caminhão:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Placa já cadastrada' });
    }
    res.status(500).json({ error: 'Erro ao criar caminhão' });
  }
});

// Rota catch-all para 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});