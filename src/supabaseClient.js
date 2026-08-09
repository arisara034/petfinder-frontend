import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://eehgejxulfwlukzxxalx.supabase.co";
const supabaseAnonKey = "sb_publishable_ssyXxydYtpgeaBRg48dc3Q_b58G0YXM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);