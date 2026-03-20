# Admin Dashboard Setup Guide

## Problem: Dashboard Not Showing Real Data

The admin dashboard wasn't displaying data because:

1. **Missing database fields** - The `guest_attempts` table was missing fields for `score`, `correct_answers`, and `wrong_answers`
2. **Field name mismatch** - The `test_cases` table uses `input` but the API expected `input_data`
3. **Error handling** - API endpoints returned errors instead of gracefully handling missing data

The dashboard will now display real data as you create exams and students take them.

## Solution Implemented

### 1. Database Schema Updates

Created `scripts/05_fix_admin_dashboard.sql`:
- Added `score`, `correct_answers`, `wrong_answers` columns to `guest_attempts`
- Renamed `test_cases.input` to `test_cases.input_data`
- Created `guest_attempt_answers` table for tracking student responses

### 2. API Fixes

Updated API endpoints to:
- Handle field name variations gracefully
- Return empty arrays on errors instead of 500 errors
- Properly calculate statistics from available data
- Use Supabase directly instead of trying to proxy to external servers

Modified files:
- `student_portal/lib/api.ts` - Fixed field name mappings
- `student_portal/app/api/dashboard/stats/route.ts` - Improved stats calculation
- `student_portal/app/api/exams/route.ts` - Added error handling
- `student_portal/app/api/monitoring/route.ts` - Added error handling
- `student_portal/app/api/results/route.ts` - Added error handling
- `student_portal/app/api/results/coding/route.ts` - Added error handling

## How to Apply Updates

### Option 1: Manual Supabase SQL Editor (Recommended for Windows)

1. Go to https://supabase.com and sign in
2. Open your project
3. Go to SQL Editor
4. Create new query and run this migration file:
   - `scripts/05_fix_admin_dashboard.sql`

### Option 2: Supabase CLI (if installed)

```bash
cd c:\Users\dell\Downloads\b_1PfGq013l5V-1773757198734
supabase db push --file scripts/05_fix_admin_dashboard.sql
```

### Option 3: Using Node.js Script

```bash
node test-db.mjs
```

This will verify the connection and show what's in the database.

## Testing the Dashboard

1. Restart the student portal:
   ```bash
   cd student_portal
   npm run dev
   ```

2. Visit http://localhost:3001

3. Login with admin credentials:
   - Email: `admin1@gmail.com` or `anishreddy375@gmail.com`
   - Password: (use your Supabase password)

4. **Create Your First Exam:**
   - Go to exam creation page
   - Add MCQ and/or coding questions
   - Publish the exam

5. **Have Students Take the Exam:**
   - Share the student link (http://localhost:3000)
   - Students enter their details and take the exam
   - Submit their answers

6. **View Real Data on Dashboard:**
   - Dashboard will now display:
     - Total exams created
     - Active exams (in-progress)
     - Total students who attempted
     - Average score (from completed exams)
     - List of recent exams
     - List of recent student attempts with scores
   - Live Monitoring page shows real-time exam activity

## Troubleshooting

### Dashboard shows no data
- Dashboard is empty until you create exams and students submit attempts
- This is normal and expected - it's all real data
- To test: Create an exam and have a student take it
- Check if migrations were applied successfully
- Verify browser console for errors (F12 > Console)
- Check server logs for API errors

### Unable to connect to database
- Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are correct
- Check environment variables in `.env.local`
- Test database connection with `node test-db.mjs`

### Migration didn't complete
- Check the full error message in Supabase SQL Editor
- Verify Supabase permissions/roles are correct
- Try running the migration in smaller chunks

## Database Schema Overview

### Key Tables:
- `exams` - Exam definitions (created by admin)
- `guest_attempts` - Student exam attempts (created when students take exams)
- `guest_attempt_answers` - Individual question answers submitted by students
- `questions` - MCQ and coding questions
- `mcq_options` - Multiple choice options
- `coding_questions` - Coding problem details
- `test_cases` - Test cases for coding problems

### Admin Dashboard Displays (Real-Time):
- **Total Exams** - Count of exams you created
- **Active Exams** - Exams currently being taken by students
- **Total Students** - Number of student attempts
- **Average Score** - Average score of completed attempts
- **Recent Exams** - Last exams created
- **Recent Attempts** - Last student attempts with scores

## Workflow

1. **You Create Exam** → Exam appears in "Total Exams"
2. **Students Start Exam** → Exam appears in "Active Exams", appears in "Live Monitoring"
3. **Students Submit** → Attempt appears in "Recent Attempts" with score
4. **Dashboard Updates** → All stats recalculate automatically

## Next Steps

1. **Apply the Schema Migration** (scripts/05_fix_admin_dashboard.sql)
2. **Restart Student Portal** to load updated code
3. **Create Your First Exam** in the admin dashboard
4. **Share Student Link** with test students
5. **Have Students Take Exam** and submit answers
6. **View Results** - Dashboard will update with real data in real-time
