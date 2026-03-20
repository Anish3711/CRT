# Real Data Only - Admin Dashboard Setup

**NO MOCK DATA** - All data is real from actual exams and student attempts.

## Quick Setup (3 Steps)

### Step 1: Apply Database Migration

Go to **https://supabase.com** → Your Project → **SQL Editor** → Create New Query

Copy and paste the entire content of:
```
scripts/05_fix_admin_dashboard.sql
```

Click **Run** 

(Or if you have Supabase CLI: `supabase db push --file scripts/05_fix_admin_dashboard.sql`)

### Step 2: Restart Student Portal

```bash
cd c:\Users\dell\Downloads\b_1PfGq013l5V-1773757198734\student_portal
npm run dev
```

### Step 3: Use the System

**Admin Portal (http://localhost:3001)**
1. Login with admin email
2. Create an exam with MCQ/coding questions
3. Publish the exam

**Student Portal (http://localhost:3000)**
1. Students enter their details
2. Students select and take the exam
3. Students submit answers

**Admin Dashboard Updates Automatically**
- Total Exams count increases
- Active Exams shows in-progress attempts
- Average Score calculates from completed exams
- Recent Exams and Attempts tables populate with real data

## What the Dashboard Shows

| Metric | Source |
|--------|--------|
| **Total Exams** | Count from `exams` table |
| **Active Exams** | Exams with status = 'active' or ongoing attempts |
| **Total Students** | Count of unique `guest_attempts` |
| **Average Score** | Avg score of completed attempts |
| **Recent Exams** | Last 5 exams created |
| **Recent Attempts** | Last 5 student submissions |

## Real Data Flow

```
Admin Creates Exam 
    ↓ (saved to `exams` table)
Student Takes Exam
    ↓ (session created in `guest_attempts` table)
Student Submits Answers
    ↓ (answers saved, score calculated)
Dashboard Updates
    ↓ (queries database, shows real stats)
```

## No Mock Data Files

- ❌ `scripts/06_seed_test_data.sql` - **Deleted** (no mock data)
- ✅ `scripts/05_fix_admin_dashboard.sql` - **Required** (schema only)

## Files Changed

**API Endpoints** (6 files):
- Handle real data from Supabase
- Return empty arrays gracefully (not errors)
- Calculate statistics correctly

**Database** (1 file):
- Added columns for scores and answer tracking
- Fixed field name consistency
- No sample/seed data

**Documentation** (2 files):
- Updated to reflect real-only data approach
- Clear workflow instructions

## Testing

After creating an exam and having a student take it:

```bash
# Check dashboard API
curl http://localhost:3001/api/dashboard/stats

# Check exams
curl http://localhost:3001/api/exams

# Check monitoring
curl http://localhost:3001/api/monitoring
```

You should see real data from your exam and student attempt.

## Troubleshooting

**Dashboard is empty:**
- ✅ Normal! Create an exam first and have a student take it
- Then come back and you'll see real data

**Column not found error:**
- Apply the migration: `scripts/05_fix_admin_dashboard.sql`

**Can't connect to database:**
- Check `.env.local` has correct Supabase credentials
- Run: `node test-db.mjs` to test connection

## Summary

✅ Schema migration applies (no sample data)
✅ Both portals process real exam data  
✅ Dashboard automatically updates with real metrics  
✅ No mock data anywhere  
✅ Complete real exam lifecycle tracking
