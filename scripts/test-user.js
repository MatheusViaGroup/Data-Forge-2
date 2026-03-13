const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = 'https://zctlgwpfodidgmutxmjw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdGxnd3Bmb2RpZGdtdXR4bWp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MjU3MywiZXhwIjoyMDg4NzI4NTczfQ._xWks_8UQq9l0LxX2pEa6ZAtMvsfyxA0pTKMEmQny1s';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  const email = 'matheus.henrique@viagroup.com.br';
  const senha = 'admin321';
  
  console.log('Buscando usuário:', email);
  
  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, senha_hash, acesso, status, must_change_password')
    .eq('email', email)
    .eq('status', 'Ativo')
    .single();
  
  if (error) {
    console.error('Erro ao buscar:', error.message);
    return;
  }
  
  if (!user) {
    console.log('Usuário não encontrado!');
    return;
  }
  
  console.log('Usuário encontrado:', user.nome);
  console.log('Status:', user.status);
  console.log('Acesso:', user.acesso);
  console.log('Hash da senha:', user.senha_hash.substring(0, 20) + '...');
  
  const match = await bcrypt.compare(senha, user.senha_hash);
  console.log('Senha confere:', match);
}

test();
