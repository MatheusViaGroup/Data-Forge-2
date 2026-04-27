const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuração do Supabase - credenciais via variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('Usuário já existe, atualizando senha...');

      const senhaHash = await bcrypt.hash(senha, 10);

      const { error } = await supabase
        .from('usuarios')
        .update({
          senha_hash: senhaHash,
          status: 'Ativo',
          must_change_password: false
        })
        .eq('email', email);

      if (error) throw error;

      console.log('Senha atualizada com sucesso!');
    } else {
      const senhaHash = await bcrypt.hash(senha, 10);

      const { data, error } = await supabase
        .from('usuarios')
        .insert({
          nome: nome,
          email: email,
          senha_hash: senhaHash,
          departamento: departamento,
          acesso: acesso,
          status: 'Ativo',
          filiais: [],
          dashboards: [],
          must_change_password: false
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Usuário criado com sucesso!');
      console.log('Email:', email);
    }
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

createUser();
