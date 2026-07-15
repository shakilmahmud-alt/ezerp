const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => envFile.split('\n').find(line => line.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

async function test() {
  const barcode = '1001100002';
  // Let's query products
  let res1 = await supabase.from('products').select('*').eq('barcode', barcode).single();
  console.log('Product:', res1.data);
  
  if (res1.data) {
    let res2 = await supabase.from('store_stocks').select('*, stores(name)').eq('product_id', res1.data.id);
    console.log('Store Stocks:', res2.error || res2.data);
    
    let res3 = await supabase.from('shop_stocks').select('*, shops(name)').eq('product_id', res1.data.id);
    console.log('Shop Stocks:', res3.error || res3.data);
  }
}
test();
