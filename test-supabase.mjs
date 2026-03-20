import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseAnonKey = '';

envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  const value = valueParts.join('=').trim().replace(/^['"](.*)['"]$/, '$1'); // Remove quotes
  if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
  if (key.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = value;
});

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your_supabase_project_url')) {
  console.error('❌ Error: Supabase credentials are missing or not updated in .env.local');
  process.exit(1);
}

console.log('Testing connection to Supabase:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('students').select('*').limit(1);
    
    if (error) {
       console.error('Error connecting to Supabase tables:', error.message);
       if(error.code === '42P01') {
         console.log('✅ Connected to Supabase Successfully!');
         console.log('⚠️ Reminder: You still need to run the SQL schemas in Supabase SQL editor to create the tables.');
       } else {
         console.log('An error occurred during connection test. The keys may be invalid.');
       }
    } else {
      console.log('✅ Connected to Supabase successfully!');
      console.log('Rows available in "students" table:', data.length);
    }
  } catch(e) {
    console.error('❌ Error testing connection:', e);
  }
}

testConnection();
