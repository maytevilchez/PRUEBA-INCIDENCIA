import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://isdczrwjtpugdwddtoiy.supabase.co';
const supabaseAnonKey = 'sb_publishable_onqjgNUN378oiObqIFvKEg_Y-Sb6XBP';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
