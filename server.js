// Importação dos módulos necessários
const express = require('express');
const cors = require('cors');
const db = require('./db'); // Importa a configuração da base de dados

// Inicialização da aplicação Express
const app = express();
const port = process.env.PORT || 3001; // Usa a porta do ambiente ou 3001 como padrão

// Middlewares
app.use(cors()); // Habilita o CORS para permitir pedidos de origens diferentes
app.use(express.json()); // Permite que o servidor entenda JSON no corpo dos pedidos

// --- ROTAS PARA MOTORISTAS ---

// Rota para obter todos os motoristas
app.get('/motoristas', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM motoristas ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro em GET /motoristas:', err.message);
    res.status(500).send('Server Error');
  }
});

// Rota para adicionar um novo motorista
app.post('/motoristas', async (req, res) => {
    try {
        const { nome, telefone, cnh } = req.body;
        const newMotorista = await db.query(
            "INSERT INTO motoristas (nome, telefone, cnh) VALUES ($1, $2, $3) RETURNING *",
            [nome, telefone, cnh]
        );
        res.json(newMotorista.rows[0]);
    } catch (err) {
        console.error('Erro em POST /motoristas:', err.message);
        res.status(500).send('Server error');
    }
});

// Rota para apagar um motorista
app.delete('/motoristas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM motoristas WHERE id = $1", [id]);
        res.json({ message: "Motorista apagado com sucesso." });
    } catch (err) {
        console.error('Erro em DELETE /motoristas/:id:', err.message);
        res.status(500).send('Server error');
    }
});

// Rota para atualizar um motorista existente
app.put('/motoristas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, telefone, cnh } = req.body;
        const updateMotorista = await db.query(
            "UPDATE motoristas SET nome = $1, telefone = $2, cnh = $3 WHERE id = $4 RETURNING *",
            [nome, telefone, cnh, id]
        );
        
        if (updateMotorista.rows.length === 0) {
            return res.status(404).json({ message: "Motorista não encontrado." });
        }

        res.json(updateMotorista.rows[0]);
    } catch (err) {
        console.error('Erro em PUT /motoristas/:id:', err.message);
        res.status(500).send('Server error');
    }
});

// Rota para designar uma tarefa a um motorista
app.put('/motoristas/:id/tarefa', async (req, res) => {
    try {
        const { id } = req.params;
        const { tarefa, caminhao_id } = req.body;

        const motoristaAtualizado = await db.query(
            "UPDATE motoristas SET tarefa_atual = $1 WHERE id = $2 RETURNING *",
            [tarefa, id]
        );

        if (motoristaAtualizado.rows.length === 0) {
            return res.status(404).json({ message: "Motorista não encontrado." });
        }

        if (caminhao_id) {
            await db.query(
                "UPDATE caminhoes SET status = 'em uso' WHERE id = $1",
                [caminhao_id]
            );
        }

        res.json(motoristaAtualizado.rows[0]);
    } catch (err) {
        console.error('Erro em PUT /motoristas/:id/tarefa:', err.message);
        res.status(500).send('Server error');
    }
});


// --- ROTAS PARA CAMINHÕES ---

// Rota para obter todos os caminhões
app.get('/caminhoes', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM caminhoes ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro em GET /caminhoes:', err.message);
        res.status(500).send('Server Error');
    }
});

// Rota para adicionar um novo camião
app.post('/caminhoes', async (req, res) => {
    try {
        const { placa, modelo, ano, capacidade } = req.body;
        const newCaminhao = await db.query(
            "INSERT INTO caminhoes (placa, modelo, ano, capacidade, status) VALUES ($1, $2, $3, $4, 'disponível') RETURNING *",
            [placa, modelo, ano, capacidade]
        );
        res.json(newCaminhao.rows[0]);
    } catch (err) {
        console.error('Erro em POST /caminhoes:', err.message);
        res.status(500).send('Server error');
    }
});

// Rota para atualizar um camião existente
app.put('/caminhoes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { placa, modelo, ano, capacidade, status } = req.body;
        const updateCaminhao = await db.query(
            "UPDATE caminhoes SET placa = $1, modelo = $2, ano = $3, capacidade = $4, status = $5 WHERE id = $6 RETURNING *",
            [placa, modelo, ano, capacidade, status, id]
        );

        if (updateCaminhao.rows.length === 0) {
            return res.status(404).json({ message: "Camião não encontrado." });
        }

        res.json(updateCaminhao.rows[0]);
    } catch (err) {
        console.error('Erro em PUT /caminhoes/:id:', err.message);
        res.status(500).send('Server error');
    }
});

// Rota para apagar um camião
app.delete('/caminhoes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM caminhoes WHERE id = $1", [id]);
        res.json({ message: "Camião apagado com sucesso." });
    } catch (err) {
        console.error('Erro em DELETE /caminhoes/:id:', err.message);
        res.status(500).send('Server error');
    }
});


// --- ROTAS PARA ESTATÍSTICAS (COM VERIFICAÇÃO DE SEGURANÇA) ---

// Rota para obter o total de motoristas
app.get('/estatisticas/total_motoristas', async (req, res) => {
    try {
        const result = await db.query('SELECT COUNT(*) AS total FROM motoristas');
        // Verificação para garantir que o resultado é válido antes de o enviar
        if (result && result.rows) {
            res.json(result.rows[0]);
        } else {
            res.json({ total: 0 }); // Envia uma resposta padrão em caso de problema
        }
    } catch (err) {
        console.error('Erro em GET /estatisticas/total_motoristas:', err.message);
        res.status(500).send('Server Error');
    }
});

// Rota para obter o total de caminhões
app.get('/estatisticas/total_caminhoes', async (req, res) => {
    try {
        const result = await db.query('SELECT COUNT(*) AS total FROM caminhoes');
        // Verificação para garantir que o resultado é válido antes de o enviar
        if (result && result.rows) {
            res.json(result.rows[0]);
        } else {
            res.json({ total: 0 }); // Envia uma resposta padrão em caso de problema
        }
    } catch (err) {
        console.error('Erro em GET /estatisticas/total_caminhoes:', err.message);
        res.status(500).send('Server Error');
    }
});


// Inicia o servidor
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
