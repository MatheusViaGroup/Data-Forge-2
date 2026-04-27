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

async function createUser() {
  const email = process.env.ADMIN_EMAIL;
  const nome = process.env.ADMIN_NOME;
  const senha = process.env.ADMIN_SENHA;
  const departamento = process.env.ADMIN_DEPARTAMENTO || 'TI';
  const acesso = process.env.ADMIN_ACESSO || 'Administrador do Locatário';

  if (!email || !nome || !senha) {
    console.error('Erro: ADMIN_EMAIL, ADMIN_NOME e ADMIN_SENHA devem estar definidos no .env');
    process.exit(1);
  }

  try {
    // Verificar se usuário já existe
    const { rows } = await pool.query(
      "SELECT id FROM via_core.usuarios WHERE email = $1 LIMIT 1",
      [email]
    );

    if (rows.length > 0) {
      console.log('Usuário já existe, atualizando senha...');

      const senhaHash = await bcrypt.hash(senha, 10);

      await pool.query(
        "UPDATE via_core.usuarios SET senha_hash = $1, status = 'Ativo', must_change_password = false WHERE email = $2",
        [senhaHash, email]
      );

      console.log('Senha atualizada com sucesso!');
    } else {
      const senhaHash = await bcrypt.hash(senha, 10);

      await pool.query(
        `INSERT INTO via_core.usuarios (nome, email, senha_hash, departamento, acesso, status, filiais, dashboards, must_change_password)
         VALUES ($1, $2, $3, $4, $5, 'Ativo', '[]'::jsonb, '[]'::jsonb, false)`,
        [nome, email, senhaHash, departamento, acesso]
      );

      console.log('Usuário criado com sucesso!');
      console.log('Email:', email);
    }
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createUser();
