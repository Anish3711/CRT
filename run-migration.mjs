// run-migration.mjs
// Run SQL migrations on Supabase

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wgoidjiusblejqhixtpo.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
  console.error('Please set it before running this migration')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function runMigration(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf-8')
    
    console.log(`📄 Running migration: ${path.basename(filePath)}`)
    
    const { error } = await supabase.rpc('exec', { sql })
    if (error) {
      console.error('❌ Migration RPC failed:', error)
      return false
    }
    
    console.log(`✅ Migration completed successfully`)
    return true
  } catch (error) {
    console.error(`❌ Migration failed:`, error)
    return false
  }
}

async function main() {
  const migrationName = process.argv[2] || '06_extend_coding_questions.sql'
  const migrationFile = path.join(__dirname, 'scripts', migrationName)
  
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Migration file not found: ${migrationFile}`)
    process.exit(1)
  }
  
  const success = await runMigration(migrationFile)
  process.exit(success ? 0 : 1)
}

main()
