const bcrypt = require('bcryptjs');

async function test() {
  const senha = 'admin321';
  const hash = await bcrypt.hash(senha, 10);
  console.log('Hash gerado:', hash);
  
  const match = await bcrypt.compare(senha, hash);
  console.log('Senha confere:', match);
}

test();
