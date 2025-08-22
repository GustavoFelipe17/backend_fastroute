// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

const app = express();
const port = process.env.PORT || 5000;

// Configuração do CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://fastroute.netlify.app',
    'https://seu-app.vercel.app',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas de autenticação (públicas)
app.use('/api/auth', authRoutes);

// Rota principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de Gestão de Tarefas funcionando!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/auth/login - Login de usuário',
      'POST /api/auth/register - Cadastro de usuário',
      'GET /api/auth/verify - Verificar token',
      'GET /api/tarefas - Listar tarefas (requer autenticação)',
      'POST /api/tarefas - Criar tarefa (requer autenticação)',
      'PUT /api/tarefas/:id - Atualizar tarefa (requer autenticação)',
      'DELETE /api/tarefas/:id - Deletar tarefa (requer autenticação)',
      'GET /api/motoristas - Listar motoristas (requer autenticação)',
      'POST /api/motoristas - Criar motorista (requer autenticação)',
      'GET /api/caminhoes - Listar caminhões (requer autenticação)',
      'POST /api/caminhoes - Criar caminhão (requer autenticação)'
    ]
  });
});

// Health check
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

// MIDDLEWARE DE AUTENTICAÇÃO PARA TODAS AS ROTAS PROTEGIDAS
app.use('/api/tarefas', authenticateToken);
app.use('/api/motoristas', authenticateToken);
app.use('/api/caminhoes', authenticateToken);
app.use('/api/estatisticas', authenticateToken);

// --- ROTAS PROTEGIDAS PARA TAREFAS ---
app.get('/api/tarefas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tarefas ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro em GET /api/tarefas:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.post('/api/tarefas', async (req, res) => {
    try {
        const { codigo, cliente, endereco, tipo, equipamento, peso, data, periodo } = req.body;
        
        console.log('Dados recebidos:', req.body);
        console.log('Usuário autenticado:', req.user);
        
        if (!codigo || !cliente || !endereco || !tipo || !equipamento || !peso) {
            return res.status(400).json({ 
                error: 'Campos obrigatórios: código, cliente, endereço, tipo, equipamento e peso' 
            });
        }

        const result = await pool.query(
            `INSERT INTO tarefas (codigo, cliente, endereco, tipo, equipamento, peso, data, periodo, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pendente') 
             RETURNING *`,
            [codigo, cliente, endereco, tipo, equipamento, peso, data, periodo]
        );

        console.log('Tarefa criada:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro em POST /api/tarefas:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.put('/api/tarefas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { codigo, cliente, endereco, tipo, equipamento, peso, data, periodo, status } = req.body;
        
        console.log(`Atualizando tarefa ${id}:`, req.body);
        
        const result = await pool.query(
            `UPDATE tarefas SET 
             codigo = $1, cliente = $2, endereco = $3, tipo = $4, 
             equipamento = $5, peso = $6, data = $7, periodo = $8, status = $9 
             WHERE id = $10 RETURNING *`,
            [codigo, cliente, endereco, tipo, equipamento, peso, data, periodo, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada' });
        }

        console.log('Tarefa atualizada:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro em PUT /api/tarefas:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.patch('/api/tarefas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        console.log(`Atualizando parcialmente tarefa ${id}:`, updates);
        
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        
        if (fields.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }
        
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const query = `UPDATE tarefas SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`;
        
        const result = await pool.query(query, [...values, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada' });
        }
        
        console.log('Tarefa atualizada parcialmente:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro em PATCH /api/tarefas:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.delete('/api/tarefas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`Deletando tarefa ${id}`);
        
        const result = await pool.query('DELETE FROM tarefas WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada' });
        }
        
        console.log('Tarefa deletada:', result.rows[0]);
        res.json({ message: 'Tarefa deletada com sucesso', tarefa: result.rows[0] });
    } catch (err) {
        console.error('Erro em DELETE /api/tarefas:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

// --- ROTAS PROTEGIDAS PARA MOTORISTAS ---
app.get('/api/motoristas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM motoristas ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro em GET /motoristas:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.post('/api/motoristas', async (req, res) => {
    try {
        const { nome, cnh, telefone, email } = req.body;
        
        if (!nome || !cnh) {
            return res.status(400).json({ error: 'Nome e CNH são obrigatórios' });
        }

        const result = await pool.query(
            'INSERT INTO motoristas (nome, cnh, telefone, email, disponivel) VALUES ($1, $2, $3, $4, true) RETURNING *',
            [nome, cnh, telefone, email]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro em POST /motoristas:', err.message);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'CNH já cadastrada no sistema' });
        }
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

// --- ROTAS PROTEGIDAS PARA CAMINHÕES ---
app.get('/api/caminhoes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM caminhoes ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro em GET /caminhoes:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.post('/api/caminhoes', async (req, res) => {
    try {
        const { placa, modelo, marca, ano, capacidade } = req.body;
        
        if (!placa || !modelo) {
            return res.status(400).json({ error: 'Placa e modelo são obrigatórios' });
        }

        const result = await pool.query(
            'INSERT INTO caminhoes (placa, modelo, marca, ano, capacidade, disponivel) VALUES ($1, $2, $3, $4, $5, true) RETURNING *',
            [placa, modelo, marca, ano, capacidade]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro em POST /caminhoes:', err.message);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Placa já cadastrada no sistema' });
        }
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

// --- ESTATÍSTICAS PROTEGIDAS ---
app.get('/api/estatisticas/total_motoristas', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as total FROM motoristas');
        res.json({ total: parseInt(result.rows[0].total) });
    } catch (err) {
        console.error('Erro em estatísticas de motoristas:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

app.get('/api/estatisticas/total_caminhoes', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as total FROM caminhoes');
        res.json({ total: parseInt(result.rows[0].total) });
    } catch (err) {
        console.error('Erro em estatísticas de caminhões:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

// Middleware para tratar rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// Middleware para tratar erros globais
app.use((error, req, res, next) => {
  console.error('Erro não capturado:', error);
  res.status(500).json({
    error: 'Erro interno do servidor',
    details: error.message
  });
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📝 Endpoints disponíveis:`);
  console.log(`   • GET  /health - Health check`);
  console.log(`   • POST /api/auth/login - Login`);
  console.log(`   • POST /api/auth/register - Cadastro`);
  console.log(`   • GET  /api/auth/verify - Verificar token`);
  console.log(`   • GET  /api/tarefas - Listar tarefas (autenticado)`);
  console.log(`   • POST /api/tarefas - Criar tarefa (autenticado)`);
  console.log(`   • GET  /api/motoristas - Listar motoristas (autenticado)`);
  console.log(`   • GET  /api/caminhoes - Listar caminhões (autenticado)`);
});