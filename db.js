const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionString = isProduction
  ? process.env.DATABASE_URL
  : undefined

// Criar pool de conexões com PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

// Testar a conexão
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erro ao conectar no banco de dados:', err.stack);
  } else {
    console.log('✅ Conectado ao PostgreSQL com sucesso!');
    release();
  }
});

// Tratar erros da pool
pool.on('error', (err) => {
  console.error('Erro inesperado no banco de dados:', err);
  process.exit(-1);
});

module.exports = pool;