// middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_aqui_mude_em_producao';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acesso requerido' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Erro na verificação do token:', err.message);
      return res.status(403).json({ 
        error: 'Token inválido ou expirado' 
      });
    }

    req.user = user; // Adiciona os dados do usuário ao request
    next();
  });
};

module.exports = {
  authenticateToken,
  JWT_SECRET
};