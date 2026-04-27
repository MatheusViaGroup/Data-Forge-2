const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Erro: DATABASE_URL deve estar definida no .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function test() {
  const email = process.env.TEST_EMAIL || 'matheus.henrique@viagroup.com.br';
  const senha = process.env.TEST_SENHA;

  if (!senha) {
    console.error('Erro: TEST_SENHA deve estar definida no .env');
    process.exit(1);
  }

  console.log('Buscando usuário:', email);

  try {
    const { rows } = await pool.query(
      "SELECT id, nome, email, senha_hash, acesso, status, must_change_password FROM via_core.usuarios WHERE email = $1 AND status = 'Ativo' LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      console.log('Usuário não encontrado!');
      return;
    }

    const user = rows[0];
    console.log('Usuário encontrado:', user.nome);
    console.log('Status:', user.status);
    console.log('Acesso:', user.acesso);
    console.log('Hash da senha:', user.senha_hash.substring(0, 20) + '...');

    const match = await bcrypt.compare(senha, user.senha_hash);
    console.log('Senha confere:', match);
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

test();
