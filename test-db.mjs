import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wgoidjiusblejqhixtpo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2lkaml1c2JsZWpxaGl4dHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTk3MDEsImV4cCI6MjA4OTMzNTcwMX0.koK_FEvJ2OOn1Kwig8gUjCipJIkplwC0BL2RviOXFbM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuery() {
  console.log('Testing guest_attempts...')
  const { data, error } = await supabase.from('guest_attempts').select('*')
  if (error) {
    console.error('guest_attempts ERROR:', error)
  } else {
    console.log(`guest_attempts OK. Found ${data.length} records.`)
    if (data.length > 0) console.log(data)
  }

  console.log('\nTesting exams...')
  const { data: exams, error: examsErr } = await supabase.from('exams').select('*')
  if (examsErr) {
    console.error('exams ERROR:', examsErr)
  } else {
    console.log(`exams OK. Found ${exams.length} records.`)
  }
}

testQuery()
