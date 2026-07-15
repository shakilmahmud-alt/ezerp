const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => envFile.split('\n').find(line => line.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

async function test() {
  const { data, error } = await supabase.rpc('get_tables'); // Try to fetch from RPC if it exists
  console.log("RPC get_tables:", error || data);
  
  // Let's just fetch from information_schema via query using a fallback? Supabase JS doesn't support raw SQL without RPC.
}
test();
