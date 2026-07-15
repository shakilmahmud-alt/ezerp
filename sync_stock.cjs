const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => envFile.split('\n').find(line => line.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

async function syncStock() {
  try {
    console.log("Fetching Banani Model Town store id...");
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('id')
      .ilike('name', '%Banani%')
      .single();
      
    if (storeErr || !store) {
      console.log("Could not find store:", storeErr);
      return;
    }
    
    console.log("Store ID:", store.id);
    
    // Fetch products that have str_stock > 0
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, str_stock')
      .gt('str_stock', 0);
      
    if (prodErr || !products) {
      console.log("Error fetching products:", prodErr);
      return;
    }
    
    console.log(`Found ${products.length} products with str_stock > 0`);
    
    let successCount = 0;
    for (const p of products) {
      // check if it exists in store_stocks
      const { data: existing } = await supabase
        .from('store_stocks')
        .select('id')
        .eq('store_id', store.id)
        .eq('product_id', p.id)
        .single();
        
      if (!existing) {
        const { error: insertErr } = await supabase
          .from('store_stocks')
          .insert({
            store_id: store.id,
            product_id: p.id,
            stock_qty: p.str_stock
          });
        if (!insertErr) successCount++;
        else console.log("Insert err for product", p.id, insertErr);
      } else {
        const { error: updateErr } = await supabase
          .from('store_stocks')
          .update({ stock_qty: p.str_stock })
          .eq('id', existing.id);
        if (!updateErr) successCount++;
      }
    }
    
    console.log(`Successfully synced ${successCount} products to store_stocks for Banani Model Town.`);
  } catch (e) {
    console.error(e);
  }
}

syncStock();
