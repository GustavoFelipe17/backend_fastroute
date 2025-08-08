// testDb.js
const db = require('./db');

async function testar() {
  console.log('🔄 Testando conexão com o banco...\n');
  
  try {
    // Se você usou a versão simples
    const result = await db.query('SELECT NOW()');
    console.log('✅ Conexão funcionando!');
    console.log('📅 Data/hora do servidor:', result.rows[0].now);
    
    // Testar se as tabelas existem
    const tabelas = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📋 Tabelas encontradas:');
    tabelas.rows.forEach(row => {
      console.log('  - ' + row.table_name);
    });
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  
  process.exit();
}

testar();