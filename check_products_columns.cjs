const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => envFile.split('\n').find(line => line.startsWith(key))?.split('=')[1]?.trim();

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  const { data: p } = await supabase
    .from('promotions')
    .select('*')
    .or('circular_code.ilike.%CPC%,circular_name.ilike.%Price%');
  console.log('Promotions:', p);
}

testFetch();
