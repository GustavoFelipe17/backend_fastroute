const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();

// ===========================
// MIDDLEWARES
// ===========================
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Só localhost
  credentials: true
}));

// DEPOIS (deve ficar assim):
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    'https://fastroute.netlify.app',  // ← SEU SITE NO NETLIFY
    'https://*.netlify.app'           // ← QUALQUER SUBDOMÍNIO NETLIFY
  ],
  credentials: true
}));
app.use(express.json());

// ===========================
// ROTA DE TESTE
// ===========================
app.get('/api/test', (req, res) => {
  res.json({ message: '✅ API funcionando!' });
});

// ===========================
// ROTAS DE TAREFAS
// ===========================

// Listar todas as tarefas
app.get('/api/tarefas', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tarefas ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar tarefas:', err);
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

// Buscar uma tarefa específica
app.get('/api/tarefas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM tarefas WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar tarefa:', err);
    res.status(500).json({ error: 'Erro ao buscar tarefa' });
  }
});

// Criar nova tarefa
app.post('/api/tarefas', async (req, res) => {
  try {
    const { 
      codigo, 
      cliente, 
      endereco, 
      tipo, 
      equipamento, 
      peso, 
      data, 
      periodo 
    } = req.body;

    const result = await pool.query(
      `INSERT INTO tarefas 
       (codigo, cliente, endereco, tipo, equipamento, peso, data, periodo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [codigo, cliente, endereco, tipo, equipamento, peso, data, periodo]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar tarefa:', err);
    
    // Tratar erro de código duplicado
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Código de tarefa já existe' });
    }
    
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

// Atualizar tarefa (designar motorista/caminhão)
app.put('/api/tarefas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, motorista, caminhao } = req.body;
    
    const result = await pool.query(
      `UPDATE tarefas 
       SET status = $1, motorista = $2, caminhao = $3, 
           data_finalizacao = CASE 
             WHEN $1 = 'Concluída' THEN NOW() 
             ELSE data_finalizacao 
           END
       WHERE id = $4 
       RETURNING *`,
      [status, motorista, caminhao, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar tarefa:', err);
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

// Editar tarefa completa
app.patch('/api/tarefas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      codigo, 
      cliente, 
      endereco, 
      equipamento, 
      peso 
    } = req.body;
    
    const result = await pool.query(
      `UPDATE tarefas 
       SET codigo = $1, cliente = $2, endereco = $3, 
           equipamento = $4, peso = $5
       WHERE id = $6 
       RETURNING *`,
      [codigo, cliente, endereco, equipamento, peso, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao editar tarefa:', err);
    res.status(500).json({ error: 'Erro ao editar tarefa' });
  }
});

// Deletar tarefa
app.delete('/api/tarefas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM tarefas WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    res.json({ message: 'Tarefa excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir tarefa:', err);
    res.status(500).json({ error: 'Erro ao excluir tarefa' });
  }
});

// ===========================
// ROTAS DE MOTORISTAS
// ===========================

// Listar todos os motoristas
app.get('/api/motoristas', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM motoristas ORDER BY nome'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar motoristas:', err);
    res.status(500).json({ error: 'Erro ao buscar motoristas' });
  }
});

// Criar novo motorista
app.post('/api/motoristas', async (req, res) => {
  try {
    const { nome, email, telefone, cnh, categoria, status } = req.body;
    
    const result = await pool.query(
      `INSERT INTO motoristas 
       (nome, email, telefone, cnh, categoria, status) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
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

// Atualizar motorista
app.put('/api/motoristas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, cnh, categoria, status } = req.body;
    
    const result = await pool.query(
      `UPDATE motoristas 
       SET nome = $1, email = $2, telefone = $3, 
           cnh = $4, categoria = $5, status = $6
       WHERE id = $7 
       RETURNING *`,
      [nome, email, telefone, cnh, categoria, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Motorista não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar motorista:', err);
    res.status(500).json({ error: 'Erro ao atualizar motorista' });
  }
});

// Deletar motorista
app.delete('/api/motoristas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM motoristas WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Motorista não encontrado' });
    }
    
    res.json({ message: 'Motorista excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir motorista:', err);
    res.status(500).json({ error: 'Erro ao excluir motorista' });
  }
});

// ===========================
// ROTAS DE CAMINHÕES
// ===========================

// Listar todos os caminhões
app.get('/api/caminhoes', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM caminhoes ORDER BY placa'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar caminhões:', err);
    res.status(500).json({ error: 'Erro ao buscar caminhões' });
  }
});

// Criar novo caminhão
app.post('/api/caminhoes', async (req, res) => {
  try {
    const { placa, modelo, capacidade, status } = req.body;
    
    const result = await pool.query(
      `INSERT INTO caminhoes 
       (placa, modelo, capacidade, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
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

// Atualizar caminhão
app.put('/api/caminhoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { placa, modelo, capacidade, status } = req.body;
    
    const result = await pool.query(
      `UPDATE caminhoes 
       SET placa = $1, modelo = $2, capacidade = $3, status = $4
       WHERE id = $5 
       RETURNING *`,
      [placa, modelo, capacidade, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Caminhão não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar caminhão:', err);
    res.status(500).json({ error: 'Erro ao atualizar caminhão' });
  }
});

// Deletar caminhão
app.delete('/api/caminhoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM caminhoes WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Caminhão não encontrado' });
    }
    
    res.json({ message: 'Caminhão excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir caminhão:', err);
    res.status(500).json({ error: 'Erro ao excluir caminhão' });
  }
});

// ===========================
// ROTA DE ESTATÍSTICAS
// ===========================
app.get('/api/estatisticas', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM tarefas) as total_tarefas,
        (SELECT COUNT(*) FROM tarefas WHERE status = 'Pendente') as pendentes,
        (SELECT COUNT(*) FROM tarefas WHERE status = 'Designada') as designadas,
        (SELECT COUNT(*) FROM tarefas WHERE status = 'Concluída') as concluidas,
        (SELECT COUNT(*) FROM tarefas WHERE status = 'Cancelada') as canceladas,
        (SELECT COUNT(*) FROM motoristas) as total_motoristas,
        (SELECT COUNT(*) FROM caminhoes) as total_caminhoes
    `);
    
    res.json(stats.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar estatísticas:', err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// ===========================
// TRATAMENTO DE ROTAS NÃO ENCONTRADAS
// ===========================
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ===========================
// INICIAR SERVIDOR
// ===========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
🚀 Servidor rodando na porta ${PORT}
📍 URL: http://localhost:${PORT}
📡 API: http://localhost:${PORT}/api
  `);
});