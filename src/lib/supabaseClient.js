import { createClient } from '@supabase/supabase-js';
import { mysqlClient } from './mysqlClient';

const supabaseUrl = 'https://ernwwcsytmbjjxmqyxyn.supabase.co';
const supabaseKey = 'sb_publishable_5XyhGV2fr61HFPieqtAkvQ_zTPtzsF6';

const nativeSupabase = createClient(supabaseUrl, supabaseKey);

// Toggle backend: Set VITE_DATA_BACKEND='mysql' in .env or switch to true
const useMysql = import.meta.env.VITE_DATA_BACKEND === 'mysql';

export const supabase = useMysql ? mysqlClient : nativeSupabase;
export { nativeSupabase, mysqlClient };
