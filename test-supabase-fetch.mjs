import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseAnonKey = '';

envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  const value = valueParts.join('=').trim().replace(/^['"](.*)['"]$/, '$1');
  if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
  if (key.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = value;
});

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your_supabase_project_url')) {
  console.error('❌ Error: Supabase credentials are missing or not updated in .env.local');
  process.exit(1);
}

console.log('Testing connection to Supabase via REST API:', supabaseUrl);

async function testConnection() {
  try {
    const tableRes = await fetch(`${supabaseUrl}/rest/v1/students?select=*&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (tableRes.ok) {
       const rows = await tableRes.json();
       console.log('✅ Connection Sucessful! Accessed "students" table successfully. Rows found:', rows.length);
    } else {
       const errData = await tableRes.json();
       if (errData.code === '42P01') {
           console.log('✅ Connection Successful! The API key matches the URL.');
           console.log('⚠️ The "students" table does not exist yet. Please run the SQL setup script (`scripts/01_create_schema.sql`) in your Supabase SQL Editor.');
       } else {
           console.error('❌ Could not query "students" table:', errData);
       }
    }
  } catch(e) {
    console.error('❌ Error testing connection:', e);
  }
}

testConnection();
