const { Pool } = require('pg');

// A linha 'require('dotenv').config()' foi removida daqui.

// Agora, quando este código for executado, process.env.DATABASE_URL já terá o valor correto.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Adicionamos um log para confirmar a ligação no arranque.
// Isto vai aparecer nos logs do Render se a ligação for bem-sucedida.
pool.connect((err, client, release) => {
  if (err) {
    return console.error('ERRO AO LIGAR À BASE DE DADOS:', err.stack);
  }
  console.log('Base de dados ligada com sucesso.');
  client.release();
});

module.exports = pool;
