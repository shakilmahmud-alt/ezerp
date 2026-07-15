const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => envFile.split('\n').find(line => line.startsWith(key))?.split('=')[1]?.trim();

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  const { data, error } = await supabase
    .from('requisition_items')
    .select('*, products(item_name, barcode, mrp, category, subcategory)')
    .limit(1);

  if (error) {
    console.error('Fetch Error:', error.message || error);
  } else {
    console.log('Fetch Success:', data);
  }
}

testFetch();
