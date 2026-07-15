const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => envFile.split('\n').find(line => line.startsWith(key))?.split('=')[1]?.trim();

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkShops() {
  const { data: shops, error: shopsErr } = await supabase.from('shops').select('id, name').limit(5);
  console.log('Shops:', shops, shopsErr);

  const { data: stores, error: storesErr } = await supabase.from('stores').select('id, name').limit(5);
  console.log('Stores:', stores, storesErr);
}

checkShops();
