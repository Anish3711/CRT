import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    const migrationName = process.argv[2] || '01_create_schema.sql';
    const sql = fs.readFileSync(`./scripts/${migrationName}`, 'utf-8');

    console.log(`Executing migration: ${migrationName}`);
    const { error } = await supabase.rpc('exec', { sql });
    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
