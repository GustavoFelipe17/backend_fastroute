const { Pool } = require('pg');
require('dotenv').config();

// Configuração do pool de conexões com o PostgreSQL
const pool = new Pool({
  // A connectionString é a forma mais segura de passar as credenciais em produção
  connectionString: process.env.DATABASE_URL,
  // A configuração SSL é necessária para conexões com serviços como o Render
  ssl: {
    rejectUnauthorized: false
  }
});

// Exportamos o próprio pool diretamente.
// As consultas serão feitas a partir desta instância.
module.exports = pool;
