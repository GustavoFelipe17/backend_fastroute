// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Função para gerar token JWT
const generateToken = (userId, email, nome) => {
  return jwt.sign(
    { 
      userId, 
      email,
      nome 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Rota de Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('senha').isLength({ min: 1 })
], async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array()
      });
    }

    const { email, senha } = req.body;

    console.log('Tentativa de login:', email);

    // Buscar usuário no banco
    const userResult = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Email ou senha incorretos'
      });
    }

    const user = userResult.rows[0];

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({
        error: 'Email ou senha incorretos'
      });
    }

    // Gerar token
    const token = generateToken(user.id, user.email, user.nome);

    // Atualizar última atualizacao
    await pool.query(
      'UPDATE usuarios SET ultima_atualizacao = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Erro no login:', err.message);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: err.message
    });
  }
});

// Rota de Cadastro
router.post('/register', [
  body('nome').isLength({ min: 2, max: 100 }).trim(),
  body('cpf').matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/),
  body('email').isEmail().normalizeEmail(),
  body('telefone').optional().matches(/^\(\d{2}\) \d{4,5}-\d{4}$/),
  body('senha').isLength({ min: 6 })
], async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array()
      });
    }

    const { nome, cpf, email, telefone, senha } = req.body;

    console.log('Tentativa de cadastro:', email);

    // Verificar se o email já existe
    const emailExists = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (emailExists.rows.length > 0) {
      return res.status(409).json({
        error: 'Este email já está cadastrado'
      });
    }

    // Verificar se o CPF já existe
    const cpfExists = await pool.query(
      'SELECT id FROM usuarios WHERE cpf = $1',
      [cpf]
    );

    if (cpfExists.rows.length > 0) {
      return res.status(409).json({
        error: 'Este CPF já está cadastrado'
      });
    }

    // Criptografar senha
    const saltRounds = 12;
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    // Inserir usuário no banco
    const result = await pool.query(
      `INSERT INTO usuarios (nome, cpf, email, telefone, senha) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, nome, email`,
      [nome, cpf, email, telefone, senhaHash]
    );

    const newUser = result.rows[0];

    // Gerar token para o novo usuário
    const token = generateToken(newUser.id, newUser.email, newUser.nome);

    res.status(201).json({
      message: 'Usuário cadastrado com sucesso',
      token,
      user: {
        id: newUser.id,
        nome: newUser.nome,
        email: newUser.email
      }
    });

  } catch (err) {
    console.error('Erro no cadastro:', err.message);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: err.message
    });
  }
});

// Rota para verificar se o token é válido
router.get('/verify', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verificar se o usuário ainda existe e está ativo
    const userResult = await pool.query(
      'SELECT id, nome, email FROM usuarios WHERE id = $1 AND ativo = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    res.json({
      valid: true,
      user: userResult.rows[0]
    });

  } catch (err) {
    console.error('Erro na verificação do token:', err.message);
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;