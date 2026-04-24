const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuração do Supabase
const supabaseUrl = 'https://zctlgwpfodidgmutxmjw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdGxnd3Bmb2RpZGdtdXR4bWp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MjU3MywiZXhwIjoyMDg4NzI4NTczfQ._xWks_8UQq9l0LxX2pEa6ZAtMvsfyxA0pTKMEmQny1s';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUser() {
  const email = 'matheus.henrique@viagroup.com.br';
  const nome = 'Matheus Henrique';
  const senha = 'admin321';
  const departamento = 'TI';
  const acesso = 'Administrador do Locatário';
  
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
      console.log('Senha:', senha);
    }
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

createUser();
