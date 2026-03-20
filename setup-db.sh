#!/bin/bash
# Setup database schema and seed test data
# This script applies all migrations and seeds the database for the admin dashboard

echo "=== Online Exam Portal - Database Setup ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Warning: Supabase CLI not found${NC}"
    echo "To manually apply migrations:"
    echo "1. Go to Supabase dashboard: https://supabase.com"
    echo "2. Open SQL Editor"
    echo "3. Run migrations in order:"
    echo "   - scripts/01_create_schema.sql"
    echo "   - scripts/02_admin_policies.sql"
    echo "   - scripts/03_guest_attempts.sql"
    echo "   - scripts/04_fix_policies.sql"
    echo "   - scripts/05_fix_admin_dashboard.sql"
    echo "   - scripts/06_seed_test_data.sql"
    exit 1
fi

echo "Applying migrations..."
echo ""

# Run migrations in order
MIGRATIONS=(
    "01_create_schema.sql"
    "02_admin_policies.sql"
    "03_guest_attempts.sql"
    "04_fix_policies.sql"
    "05_fix_admin_dashboard.sql"
    "06_seed_test_data.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    echo -e "${YELLOW}Applying $migration...${NC}"
    if supabase db push --file "scripts/$migration" 2>/dev/null; then
        echo -e "${GREEN}✓ $migration applied${NC}"
    else
        echo -e "${RED}✗ Failed to apply $migration${NC}"
        echo "Please apply this migration manually in Supabase SQL Editor"
    fi
done

echo ""
echo -e "${GREEN}=== Database setup complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Restart the student portal: npm run dev"
echo "2. Visit http://localhost:3001"
echo "3. Login with admin credentials"
echo "4. Check the dashboard to see exam and student data"
echo ""
