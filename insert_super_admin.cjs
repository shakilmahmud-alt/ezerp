const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => envFile.split('\n').find(line => line.startsWith(key))?.split('=')[1]?.trim();

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSuperAdmin() {
  const { data: existingUser } = await supabase
    .from('employees')
    .select('id')
    .eq('username', 'admin@email.com')
    .single();

  if (existingUser) {
    const { error } = await supabase
      .from('employees')
      .update({ password: '123456', name: 'New Super Admin' })
      .eq('id', existingUser.id);
    if (error) console.error('Error updating:', error);
    else console.log('Super admin updated!');
  } else {
    // Generate a unique code
    const newCode = 'SA-' + Date.now().toString().slice(-4);
    
    const { error } = await supabase
      .from('employees')
      .insert([{
        code: newCode,
        name: 'Super Admin',
        username: 'admin@email.com',
        password: '123456',
        status: 'ACTIVE'
      }]);
    
    if (error) console.error('Error inserting:', error);
    else console.log('New Super admin created successfully!');
  }
}

addSuperAdmin();
