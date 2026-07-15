const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => envFile.split('\n').find(line => line.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

async function test() {
  const selectedDocument = 'DLV20260715655';
  let res1 = await supabase.from('requisitions').select('*, stores(name), shops(name)').or(`challan_no.eq.${selectedDocument},requisition_no.eq.${selectedDocument}`).single();
  console.log('Error:', res1.error);
  console.log('Req:', res1.data);
}
test();
