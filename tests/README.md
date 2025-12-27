# Testing Guide

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Test Environment
Add this to your `.env` file:

```env
# Test Configuration
TEST_AUTH_TOKEN=your_test_user_jwt_token
TEST_MEMBER_EMAIL=test@example.com
```

**How to get TEST_AUTH_TOKEN:**
1. Log in to your application as an e-board member
2. Open browser DevTools → Network tab
3. Find an API request and copy the `Authorization` header value (the part after "Bearer ")
4. Add it to `.env` as `TEST_AUTH_TOKEN`

**TEST_MEMBER_EMAIL:**
- Should be an actual member in your database that you can safely archive/restore during testing
- Make sure this is NOT a critical member!

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Files

### `memberArchive.test.ts`
Integration tests for member archive/restore functionality:
- ✅ Archive a member
- ✅ Get archived members list
- ✅ Restore a member
- ✅ Full cycle: Archive → Verify → Restore → Verify
- ✅ Authentication checks
- ✅ Error handling

### `performance.test.ts`
Performance tests for slow endpoints with timing analysis:
- 📊 `/users/summary` - Response time measurement and analysis
- 📊 `/member-info/active/summary` - Response time measurement and analysis
- 📊 Comparison analysis between both endpoints
- 📊 Multiple runs for consistency checking
- ⚠️ Automatic warnings for slow responses (>3s for users, >5s for members)

### `memberInfoOptimization.test.ts`
Integration and performance tests for N+1 query optimizations:
- ✅ `/member-info/` - getAllMemberInfo with role field
- ✅ `/member-info/alumni` - getAlumniMembers with role field
- ✅ `/member-info/active` - getActiveMembers with role field
- ✅ `/member-info/alumni/summary` - getAlumniMembersSummary optimized query
- ✅ `/member-info/:email` - getMemberDetailsByEmail with role field
- 📊 Performance comparison across all optimized endpoints
- 📊 Data integrity checks - role field consistency
- ⚡ Verifies N+1 query problem is resolved (all queries use view's role field)
- ⚠️ Performance thresholds for optimized endpoints (<50ms per record)

### `queryOptimization.test.ts`
Integration and performance tests for sponsors, resources, and events N+1 query optimizations:
- ✅ `/sponsor/get-all-sponsor-info` - getAllSponsors with resources (uses sponsor_resources_summary view)
- ✅ `/sponsor/:id` - getSponsorById with resources (uses sponsor_resources_summary view)
- ✅ `/resources/` - getAllResources with categories (uses categories_with_resources view)
- 📊 Performance comparison across all optimized endpoints
- 📊 Multiple runs for consistency checking (3 runs per endpoint)
- 📊 Query count verification - ensures single query instead of N+1
- ⚡ Verifies optimization: sponsors <100ms/record, resources <50ms/record
- 🔍 Validates resource URL structure and signed URLs

## What's Being Tested

### Archive/Restore Functionality

1. **Archive Member**
   - Member is archived successfully
   - Auth token required
   - Member disappears from active views
   - Member appears in archived list
   - Idempotency (archiving twice doesn't error)

2. **Restore Member**
   - Member is restored successfully
   - Auth token required
   - Member reappears in active views
   - Member disappears from archived list
   - Idempotency (restoring twice doesn't error)

3. **Get Archived Members**
   - Returns list of archived members
   - Auth token required
   - Includes deleted_at timestamp

### Performance Testing

1. **Endpoint Response Times**
   - Measures total response time
   - Calculates per-record processing time
   - Validates response structure
   - Checks for performance thresholds

2. **Performance Analysis**
   - Side-by-side comparison of slow endpoints
   - Identifies N+1 query problems
   - Suggests optimization strategies
   - Provides statistical analysis (avg, min, max, std dev)

3. **Run the Performance Tests**
   ```bash
   # Run only performance tests
   npm test -- performance.test.ts

   # Run with verbose output to see detailed timing
   npm test -- performance.test.ts --verbose
   ```

### N+1 Query Optimization Testing

1. **Role Field Verification**
   - Ensures all optimized endpoints return `role` field from the `member_hours_summary` view
   - No additional queries to `allowed_members` table needed
   - Single query execution per endpoint (JOIN already in view)

2. **Performance Benchmarks**
   - Measures response time for each optimized endpoint
   - Calculates time per record (should be <50ms per record)
   - Compares performance across all endpoints
   - Identifies potential remaining bottlenecks

3. **Data Consistency**
   - Verifies role field is consistent across different endpoints
   - Ensures same member has same role regardless of which endpoint fetched them
   - Validates data integrity after optimization

4. **Run the Optimization Tests**
   ```bash
   # Run only member info optimization tests
   npm test -- memberInfoOptimization.test.ts

   # Run with verbose output to see detailed performance metrics
   npm test -- memberInfoOptimization.test.ts --verbose
   ```

### Query Optimization Testing (Sponsors, Resources, Events)

1. **View-Based Query Optimization**
   - Uses `sponsor_resources_summary` view to fetch sponsors with resources in one query
   - Uses `categories_with_resources` view to fetch categories with resources in one query
   - Eliminates N+1 query patterns (old: 1+2N queries, new: 1 query)

2. **Performance Benchmarks**
   - Sponsors: <100ms per sponsor (old: could be >200ms per sponsor)
   - Resources: <50ms per category (old: could be >100ms per category)
   - Consistency checks across multiple runs
   - Statistical analysis (avg, min, max, std dev)

3. **Query Count Verification**
   - Verifies single query execution per endpoint
   - Detects potential N+1 patterns by analyzing time-per-record ratios
   - Warns if performance suggests multiple queries

4. **Run the Query Optimization Tests**
   ```bash
   # Run only query optimization tests
   npm test -- queryOptimization.test.ts

   # Run with verbose output to see detailed performance metrics
   npm test -- queryOptimization.test.ts --verbose

   # Run all optimization tests together
   npm test -- optimization
   ```

## Notes

- Tests use real API endpoints against your actual database
- Make sure TEST_MEMBER_EMAIL is a test account, not production data
- Tests are designed to clean up after themselves (restore after archiving)
- If a test fails mid-way, you may need to manually restore the test member

## Future Improvements

- Add database seeding for isolated test data
- Add teardown to ensure clean state
- Mock Supabase client for unit tests
- Add tests for RLS policies
- Add tests for trigger behavior (auth ban/unban)
