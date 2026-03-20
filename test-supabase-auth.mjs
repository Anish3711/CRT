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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing credentials');
  process.exit(1);
}

console.log('Testing Supabase Authentication at:', supabaseUrl);

async function testAuth() {
  try {
    const testEmail = `testuser${Date.now()}@gmail.com`; // Changed to gmail.com
    const testPassword = 'TestPassword123!';
    
    console.log(`\nAttempting to register a test user: ${testEmail}...`);
    
    const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    const signupData = await signupRes.json();
    
    if (signupRes.ok) {
        console.log('✅ Auth API is working! Registration request was successful.');
        console.log('User ID created:', signupData.user?.id || signupData.id);
        
        console.log('\nTesting complete. The Authentication endpoints are functional and securely accepting the keys.');
        console.log('If "Confirm Email" is required in your Supabase Auth settings, the user will need to verify their email before signing in.');
    } else {
        console.error('❌ Auth API rejected the request:', signupRes.status);
        console.error('Details:', signupData);
    }
  } catch(e) {
    console.error('❌ Error making auth request:', e);
  }
}

testAuth();
