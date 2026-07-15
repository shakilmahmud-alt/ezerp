const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => envFile.split('\n').find(line => line.startsWith(key))?.split('=')[1]?.trim();

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

async function getOpenAPI() {
  const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  const spec = await response.json();
  const reqItems = spec.definitions.requisition_items.properties;
  console.log('Columns in requisition_items:', Object.keys(reqItems));
}

getOpenAPI();
