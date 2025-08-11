// Importação dos módulos necessários
const express = require('express');
const cors = require('cors');
// Alterado para 'pool' para refletir que estamos a importar o pool diretamente
const pool = require('./db'); 

// Inicialização da aplicação Express
const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// --- ROTAS PARA MOTORISTAS ---

app.get('/motoristas', async (req, res) => {
  try {
    // Alterado de db.query para pool.query
    const result = await pool.query('SELECT * FROM motoristas ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro em GET /motoristas:', err.message);
    res.status(500).send('Server Error');
  }
});

app.post('/motoristas', async (req, res) => {
    try {
        const { nome, telefone, cnh } = req.body;
        const newMotorista = await pool.query(
            "INSERT INTO motoristas (nome, telefone, cnh) VALUES ($1, $2, $3) RETURNING *",
            [nome, telefone, cnh]
        );
        res.json(newMotorista.rows[0]);
    } catch (err) {
        console.error('Erro em POST /motoristas:', err.message);
        res.status(500).send('Server error');
    }
});

app.delete('/motoristas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM motoristas WHERE id = $1", [id]);
        res.json({ message: "Motorista apagado com sucesso." });
    } catch (err) {
        console.error('Erro em DELETE /motoristas/:id:', err.message);
        res.status(500).send('Server error');
    }
});

app.put('/motoristas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, telefone, cnh } = req.body;
        const updateMotorista = await pool.query(
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

app.put('/motoristas/:id/tarefa', async (req, res) => {
    try {
        const { id } = req.params;
        const { tarefa, caminhao_id } = req.body;

        const motoristaAtualizado = await pool.query(
            "UPDATE motoristas SET tarefa_atual = $1 WHERE id = $2 RETURNING *",
            [tarefa, id]
        );

        if (motoristaAtualizado.rows.length === 0) {
            return res.status(404).json({ message: "Motorista não encontrado." });
        }

        if (caminhao_id) {
            await pool.query(
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

app.get('/caminhoes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM caminhoes ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro em GET /caminhoes:', err.message);
        res.status(500).send('Server Error');
    }
});

app.post('/caminhoes', async (req, res) => {
    try {
        const { placa, modelo, ano, capacidade } = req.body;
        const newCaminhao = await pool.query(
            "INSERT INTO caminhoes (placa, modelo, ano, capacidade, status) VALUES ($1, $2, $3, $4, 'disponível') RETURNING *",
            [placa, modelo, ano, capacidade]
        );
        res.json(newCaminhao.rows[0]);
    } catch (err) {
        console.error('Erro em POST /caminhoes:', err.message);
        res.status(500).send('Server error');
    }
});

app.put('/caminhoes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { placa, modelo, ano, capacidade, status } = req.body;
        const updateCaminhao = await pool.query(
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

app.delete('/caminhoes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM caminhoes WHERE id = $1", [id]);
        res.json({ message: "Camião apagado com sucesso." });
    } catch (err) {
        console.error('Erro em DELETE /caminhoes/:id:', err.message);
        res.status(500).send('Server error');
    }
});


// --- ROTAS PARA ESTATÍSTICAS ---

app.get('/estatisticas/total_motoristas', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) AS total FROM motoristas');
        if (result && result.rows) {
            res.json(result.rows[0]);
        } else {
            res.json({ total: 0 });
        }
    } catch (err) {
        console.error('Erro em GET /estatisticas/total_motoristas:', err.message);
        res.status(500).send('Server Error');
    }
});

app.get('/estatisticas/total_caminhoes', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) AS total FROM caminhoes');
        if (result && result.rows) {
            res.json(result.rows[0]);
        } else {
            res.json({ total: 0 });
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
