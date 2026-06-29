import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ernwwcsytmbjjxmqyxyn.supabase.co';
const supabaseKey = 'sb_publishable_5XyhGV2fr61HFPieqtAkvQ_zTPtzsF6';

export const supabase = createClient(supabaseUrl, supabaseKey);
