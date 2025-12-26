import request from 'supertest';
import app from '../src/app';
import dotenv from 'dotenv';

dotenv.config();

const authToken = process.env.TEST_AUTH_TOKEN || '';

if (!authToken) {
  console.warn('\n⚠️  TEST_AUTH_TOKEN not set in .env');
  console.warn('   Performance tests will be skipped. See tests/README.md for setup instructions.\n');
}

// Skip all tests if environment not configured
const describeIfConfigured = authToken ? describe : describe.skip;

/**
 * Performance Testing Suite
 * Tests slow endpoints and measures response times
 */
describe('Performance Tests', () => {
  // Increase timeout for performance tests since we expect these might be slow
  jest.setTimeout(30000);

  describeIfConfigured('GET /users/summary', () => {
    it('should return users summary and measure performance', async () => {
      console.log('\n📊 Testing /users/summary endpoint...');

      const startTime = Date.now();

      const response = await request(app)
        .get('/users/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assertions
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Performance metrics
      const userCount = response.body.length;
      console.log(`   ✓ Response time: ${duration}ms`);
      console.log(`   ✓ Users returned: ${userCount}`);
      console.log(`   ✓ Avg time per user: ${(duration / userCount).toFixed(2)}ms`);

      // Validate response structure
      if (userCount > 0) {
        const firstUser = response.body[0];
        expect(firstUser).toHaveProperty('email');
        expect(firstUser).toHaveProperty('name');
        expect(firstUser).toHaveProperty('role');
        expect(firstUser).toHaveProperty('rank');

        console.log(`   ✓ Sample user structure:`, {
          email: firstUser.email,
          name: firstUser.name,
          role: firstUser.role,
          rank: firstUser.rank
        });
      }

      // Performance threshold (warn if over 3 seconds)
      if (duration > 3000) {
        console.warn(`   ⚠️  WARNING: Response time exceeds 3 seconds (${duration}ms)`);
      }
    });

    it('should handle request without authentication', async () => {
      const response = await request(app)
        .get('/users/summary')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describeIfConfigured('GET /member-info/active/summary', () => {
    it('should return active members summary and measure performance', async () => {
      console.log('\n📊 Testing /member-info/active/summary endpoint...');

      const startTime = Date.now();

      const response = await request(app)
        .get('/member-info/active/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assertions
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Performance metrics
      const memberCount = response.body.length;
      console.log(`   ✓ Response time: ${duration}ms`);
      console.log(`   ✓ Members returned: ${memberCount}`);
      console.log(`   ✓ Avg time per member: ${(duration / memberCount).toFixed(2)}ms`);

      // Validate response structure
      if (memberCount > 0) {
        const firstMember = response.body[0];
        expect(firstMember).toHaveProperty('user_email');
        expect(firstMember).toHaveProperty('name');
        expect(firstMember).toHaveProperty('rank');

        console.log(`   ✓ Sample member structure:`, {
          user_email: firstMember.user_email,
          name: firstMember.name,
          major: firstMember.major,
          rank: firstMember.rank,
          total_hours: firstMember.total_hours
        });
      }

      // Performance threshold (warn if over 5 seconds)
      if (duration > 5000) {
        console.warn(`   ⚠️  WARNING: Response time exceeds 5 seconds (${duration}ms)`);
      }
    });

    it('should handle request without authentication', async () => {
      const response = await request(app)
        .get('/member-info/active/summary')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should only return general-members', async () => {
      const response = await request(app)
        .get('/member-info/active/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);

      // All returned members should be non-null (general-members only)
      const allAreGeneralMembers = response.body.every((member: any) => member !== null);
      expect(allAreGeneralMembers).toBe(true);
    });

    it('should exclude alumni members', async () => {
      const response = await request(app)
        .get('/member-info/active/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);

      // No alumni should be in the active summary
      const hasAlumni = response.body.some((member: any) => member.rank === 'alumni');
      expect(hasAlumni).toBe(false);
    });
  });

  describeIfConfigured('Performance Comparison', () => {
    it('should compare both endpoints and provide analysis', async () => {
      console.log('\n📊 Performance Comparison Analysis');
      console.log('==========================================');

      // Test /users/summary
      console.log('\n1️⃣  Testing /users/summary...');
      const usersStart = Date.now();
      const usersResponse = await request(app)
        .get('/users/summary')
        .set('Authorization', `Bearer ${authToken}`);
      const usersDuration = Date.now() - usersStart;
      const usersCount = usersResponse.body.length;

      console.log(`   • Response time: ${usersDuration}ms`);
      console.log(`   • Records returned: ${usersCount}`);
      console.log(`   • Time per record: ${(usersDuration / usersCount).toFixed(2)}ms`);

      // Test /member-info/active/summary
      console.log('\n2️⃣  Testing /member-info/active/summary...');
      const membersStart = Date.now();
      const membersResponse = await request(app)
        .get('/member-info/active/summary')
        .set('Authorization', `Bearer ${authToken}`);
      const membersDuration = Date.now() - membersStart;
      const membersCount = membersResponse.body.length;

      console.log(`   • Response time: ${membersDuration}ms`);
      console.log(`   • Records returned: ${membersCount}`);
      console.log(`   • Time per record: ${(membersDuration / membersCount).toFixed(2)}ms`);

      // Analysis
      console.log('\n📈 Analysis:');
      console.log('==========================================');

      const slower = usersDuration > membersDuration ? 'users/summary' : 'member-info/active/summary';
      const faster = usersDuration > membersDuration ? 'member-info/active/summary' : 'users/summary';
      const difference = Math.abs(usersDuration - membersDuration);
      const percentDiff = ((difference / Math.min(usersDuration, membersDuration)) * 100).toFixed(1);

      console.log(`   • Slower endpoint: /${slower}`);
      console.log(`   • Faster endpoint: /${faster}`);
      console.log(`   • Difference: ${difference}ms (${percentDiff}% slower)`);

      if (usersDuration > 3000 || membersDuration > 5000) {
        console.log('\n⚠️  PERFORMANCE ISSUES DETECTED:');
        if (usersDuration > 3000) {
          console.log(`   • /users/summary is slow (${usersDuration}ms > 3000ms threshold)`);
          console.log('   • Likely cause: N+1 query problem in getUsersSummary()');
          console.log('   • Solution: Use a JOIN or view to fetch all data in one query');
        }
        if (membersDuration > 5000) {
          console.log(`   • /member-info/active/summary is slow (${membersDuration}ms > 5000ms threshold)`);
          console.log('   • Likely cause: N+1 query problem in getActiveMembersSummary()');
          console.log('   • Solution: Use a JOIN or modify the view to include role');
        }
      } else {
        console.log('\n✅ Both endpoints performing within acceptable thresholds');
      }

      console.log('\n==========================================\n');

      // Test assertions
      expect(usersResponse.status).toBe(200);
      expect(membersResponse.status).toBe(200);
    });
  });

  describeIfConfigured('Multiple Runs for Consistency', () => {
    const NUM_RUNS = 3;

    it(`should test /users/summary ${NUM_RUNS} times to check consistency`, async () => {
      console.log(`\n📊 Running /users/summary ${NUM_RUNS} times...`);
      const times: number[] = [];

      for (let i = 0; i < NUM_RUNS; i++) {
        const startTime = Date.now();
        const response = await request(app)
          .get('/users/summary')
          .set('Authorization', `Bearer ${authToken}`);
        const duration = Date.now() - startTime;

        expect(response.status).toBe(200);
        times.push(duration);
        console.log(`   Run ${i + 1}: ${duration}ms`);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);

      console.log(`\n   📈 Statistics:`);
      console.log(`   • Average: ${avg.toFixed(2)}ms`);
      console.log(`   • Min: ${min}ms`);
      console.log(`   • Max: ${max}ms`);
      console.log(`   • Std Dev: ${stdDev.toFixed(2)}ms`);
      console.log(`   • Variance: ${(max - min)}ms`);
    });

    it(`should test /member-info/active/summary ${NUM_RUNS} times to check consistency`, async () => {
      console.log(`\n📊 Running /member-info/active/summary ${NUM_RUNS} times...`);
      const times: number[] = [];

      for (let i = 0; i < NUM_RUNS; i++) {
        const startTime = Date.now();
        const response = await request(app)
          .get('/member-info/active/summary')
          .set('Authorization', `Bearer ${authToken}`);
        const duration = Date.now() - startTime;

        expect(response.status).toBe(200);
        times.push(duration);
        console.log(`   Run ${i + 1}: ${duration}ms`);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);

      console.log(`\n   📈 Statistics:`);
      console.log(`   • Average: ${avg.toFixed(2)}ms`);
      console.log(`   • Min: ${min}ms`);
      console.log(`   • Max: ${max}ms`);
      console.log(`   • Std Dev: ${stdDev.toFixed(2)}ms`);
      console.log(`   • Variance: ${(max - min)}ms`);
    });
  });
});
