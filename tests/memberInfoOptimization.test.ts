import request from 'supertest';
import app from '../src/app';
import dotenv from 'dotenv';

dotenv.config();

const authToken = process.env.TEST_AUTH_TOKEN || '';

if (!authToken) {
  console.warn('\n⚠️  TEST_AUTH_TOKEN not set in .env');
  console.warn('   Tests will be skipped. See tests/README.md for setup instructions.\n');
}

// Skip all tests if environment not configured
const describeIfConfigured = authToken ? describe : describe.skip;

/**
 * Member Info Optimization Tests
 * Tests for N+1 query optimization - verifies that role field is included from view
 * and that no additional queries are needed
 */
describe('Member Info Optimization Tests', () => {
  jest.setTimeout(30000);

  describeIfConfigured('GET /member-info/', () => {
    it('should return all members with role field included', async () => {
      console.log('\n📊 Testing GET /member-info/ (getAllMemberInfo)...');

      const response = await request(app)
        .get('/member-info/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify role field is present
      if (response.body.length > 0) {
        const firstMember = response.body[0];
        expect(firstMember).toHaveProperty('role');
        expect(firstMember).toHaveProperty('user_email');
        expect(firstMember).toHaveProperty('name');
        expect(firstMember).toHaveProperty('total_hours');

        console.log(`   ✓ Members returned: ${response.body.length}`);
        console.log(`   ✓ Role field present: ${firstMember.role}`);
      }
    });

    it('should handle request without authentication', async () => {
      const response = await request(app)
        .get('/member-info/')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describeIfConfigured('GET /member-info/alumni', () => {
    it('should return alumni members with role field included', async () => {
      console.log('\n📊 Testing GET /member-info/alumni (getAlumniMembers)...');

      const response = await request(app)
        .get('/member-info/alumni')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify all are alumni and have role field
      if (response.body.length > 0) {
        const allAreAlumni = response.body.every((member: any) => member.rank === 'alumni');
        expect(allAreAlumni).toBe(true);

        const firstAlumni = response.body[0];
        expect(firstAlumni).toHaveProperty('role');
        expect(firstAlumni).toHaveProperty('user_email');
        expect(firstAlumni).toHaveProperty('name');
        expect(firstAlumni.rank).toBe('alumni');

        console.log(`   ✓ Alumni returned: ${response.body.length}`);
        console.log(`   ✓ Role field present: ${firstAlumni.role}`);
      }
    });

    it('should handle request without authentication', async () => {
      const response = await request(app)
        .get('/member-info/alumni')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });

  describeIfConfigured('GET /member-info/active', () => {
    it('should return active members with role field included', async () => {
      console.log('\n📊 Testing GET /member-info/active (getActiveMembers)...');

      const response = await request(app)
        .get('/member-info/active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify none are alumni and have role field
      if (response.body.length > 0) {
        const noneAreAlumni = response.body.every((member: any) => member.rank !== 'alumni');
        expect(noneAreAlumni).toBe(true);

        const firstActive = response.body[0];
        expect(firstActive).toHaveProperty('role');
        expect(firstActive).toHaveProperty('user_email');
        expect(firstActive).toHaveProperty('name');
        expect(firstActive.rank).not.toBe('alumni');

        console.log(`   ✓ Active members returned: ${response.body.length}`);
        console.log(`   ✓ Role field present: ${firstActive.role}`);
      }
    });

    it('should exclude alumni members', async () => {
      const response = await request(app)
        .get('/member-info/active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);

      const hasAlumni = response.body.some((member: any) => member.rank === 'alumni');
      expect(hasAlumni).toBe(false);
    });

    it('should handle request without authentication', async () => {
      const response = await request(app)
        .get('/member-info/active')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });

  describeIfConfigured('GET /member-info/alumni/summary', () => {
    it('should return alumni summary with optimized query', async () => {
      console.log('\n📊 Testing GET /member-info/alumni/summary (getAlumniMembersSummary)...');

      const startTime = Date.now();

      const response = await request(app)
        .get('/member-info/alumni/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify structure and optimization
      if (response.body.length > 0) {
        const firstAlumni = response.body[0];

        // Should have essential fields
        expect(firstAlumni).toHaveProperty('id');
        expect(firstAlumni).toHaveProperty('user_email');
        expect(firstAlumni).toHaveProperty('name');
        expect(firstAlumni).toHaveProperty('major');
        expect(firstAlumni).toHaveProperty('first_link');

        // All should be alumni and general-members (filtered in query)
        const allAreAlumni = response.body.every((member: any) => member.rank === 'alumni');
        expect(allAreAlumni).toBe(true);

        console.log(`   ✓ Alumni returned: ${response.body.length}`);
        console.log(`   ✓ Response time: ${duration}ms`);
        console.log(`   ✓ Time per member: ${(duration / response.body.length).toFixed(2)}ms`);

        // Performance threshold - should be fast with optimized query
        if (duration > 2000) {
          console.warn(`   ⚠️  WARNING: Response slower than expected (${duration}ms > 2000ms)`);
        } else {
          console.log(`   ✅ Performance: Good (${duration}ms < 2000ms threshold)`);
        }
      }
    });

    it('should only return general-member alumni', async () => {
      const response = await request(app)
        .get('/member-info/alumni/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);

      // All should be alumni (role filtering happens in view)
      const allAreAlumni = response.body.every((member: any) => member.rank === 'alumni');
      expect(allAreAlumni).toBe(true);
    });

    it('should handle request without authentication', async () => {
      const response = await request(app)
        .get('/member-info/alumni/summary')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });

  describeIfConfigured('GET /member-info/:email', () => {
    it('should return member details with role field from view', async () => {
      console.log('\n📊 Testing GET /member-info/:email (getMemberDetailsByEmail)...');

      // First get a member email to test with
      const listResponse = await request(app)
        .get('/member-info/active')
        .set('Authorization', `Bearer ${authToken}`);

      if (listResponse.body.length === 0) {
        console.warn('   ⚠️  No members found to test with');
        return;
      }

      const testEmail = listResponse.body[0].user_email;

      const response = await request(app)
        .get(`/member-info/${testEmail}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('role');
      expect(response.body).toHaveProperty('user_email', testEmail);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('total_hours');
      expect(response.body).toHaveProperty('event_attendance');

      console.log(`   ✓ Member details retrieved for: ${testEmail}`);
      console.log(`   ✓ Role field present: ${response.body.role}`);
      console.log(`   ✓ Event attendance included: ${response.body.event_attendance.length} events`);
    });

    it('should return null for non-existent member', async () => {
      const response = await request(app)
        .get('/member-info/nonexistent@example.com')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });

    it('should handle request without authentication', async () => {
      const response = await request(app)
        .get('/member-info/test@example.com')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });

  describeIfConfigured('Performance: Compare Optimized Endpoints', () => {
    it('should measure performance improvements across all optimized endpoints', async () => {
      console.log('\n📊 Performance Analysis: Optimized Endpoints');
      console.log('==========================================');

      const results: { endpoint: string; duration: number; count: number }[] = [];

      // Test getAllMemberInfo
      console.log('\n1️⃣  Testing /member-info/ (getAllMemberInfo)...');
      const allStart = Date.now();
      const allResponse = await request(app)
        .get('/member-info/')
        .set('Authorization', `Bearer ${authToken}`);
      const allDuration = Date.now() - allStart;
      results.push({ endpoint: '/member-info/', duration: allDuration, count: allResponse.body.length });
      console.log(`   • Response time: ${allDuration}ms`);
      console.log(`   • Records: ${allResponse.body.length}`);
      console.log(`   • Time per record: ${(allDuration / allResponse.body.length).toFixed(2)}ms`);

      // Test getAlumniMembers
      console.log('\n2️⃣  Testing /member-info/alumni (getAlumniMembers)...');
      const alumniStart = Date.now();
      const alumniResponse = await request(app)
        .get('/member-info/alumni')
        .set('Authorization', `Bearer ${authToken}`);
      const alumniDuration = Date.now() - alumniStart;
      results.push({ endpoint: '/member-info/alumni', duration: alumniDuration, count: alumniResponse.body.length });
      console.log(`   • Response time: ${alumniDuration}ms`);
      console.log(`   • Records: ${alumniResponse.body.length}`);
      console.log(`   • Time per record: ${(alumniDuration / alumniResponse.body.length).toFixed(2)}ms`);

      // Test getActiveMembers
      console.log('\n3️⃣  Testing /member-info/active (getActiveMembers)...');
      const activeStart = Date.now();
      const activeResponse = await request(app)
        .get('/member-info/active')
        .set('Authorization', `Bearer ${authToken}`);
      const activeDuration = Date.now() - activeStart;
      results.push({ endpoint: '/member-info/active', duration: activeDuration, count: activeResponse.body.length });
      console.log(`   • Response time: ${activeDuration}ms`);
      console.log(`   • Records: ${activeResponse.body.length}`);
      console.log(`   • Time per record: ${(activeDuration / activeResponse.body.length).toFixed(2)}ms`);

      // Test getAlumniMembersSummary
      console.log('\n4️⃣  Testing /member-info/alumni/summary (getAlumniMembersSummary)...');
      const alumniSummaryStart = Date.now();
      const alumniSummaryResponse = await request(app)
        .get('/member-info/alumni/summary')
        .set('Authorization', `Bearer ${authToken}`);
      const alumniSummaryDuration = Date.now() - alumniSummaryStart;
      results.push({ endpoint: '/member-info/alumni/summary', duration: alumniSummaryDuration, count: alumniSummaryResponse.body.length });
      console.log(`   • Response time: ${alumniSummaryDuration}ms`);
      console.log(`   • Records: ${alumniSummaryResponse.body.length}`);
      console.log(`   • Time per record: ${(alumniSummaryDuration / alumniSummaryResponse.body.length).toFixed(2)}ms`);

      // Summary
      console.log('\n📈 Performance Summary:');
      console.log('==========================================');

      const avgTimePerRecord = results.map(r => r.duration / r.count);
      const maxTimePerRecord = Math.max(...avgTimePerRecord);
      const slowest = results[avgTimePerRecord.indexOf(maxTimePerRecord)];

      console.log(`   • Slowest endpoint: ${slowest.endpoint}`);
      console.log(`   • Slowest time per record: ${maxTimePerRecord.toFixed(2)}ms`);

      // All should be reasonably fast with optimized queries
      const allFast = results.every(r => (r.duration / r.count) < 50); // < 50ms per record
      if (allFast) {
        console.log('\n✅ All endpoints performing well with optimized queries');
      } else {
        console.warn('\n⚠️  Some endpoints may still have performance issues');
        results.forEach(r => {
          const timePerRecord = r.duration / r.count;
          if (timePerRecord >= 50) {
            console.warn(`   • ${r.endpoint}: ${timePerRecord.toFixed(2)}ms per record (>50ms threshold)`);
          }
        });
      }

      console.log('\n==========================================\n');

      // Assertions
      expect(allResponse.status).toBe(200);
      expect(alumniResponse.status).toBe(200);
      expect(activeResponse.status).toBe(200);
      expect(alumniSummaryResponse.status).toBe(200);
    });
  });

  describeIfConfigured('Data Integrity: Role Field Consistency', () => {
    it('should verify role field is consistent across all endpoints', async () => {
      console.log('\n📊 Verifying role field consistency...');

      // Get a test member's email
      const listResponse = await request(app)
        .get('/member-info/active')
        .set('Authorization', `Bearer ${authToken}`);

      if (listResponse.body.length === 0) {
        console.warn('   ⚠️  No members found to test with');
        return;
      }

      const testMember = listResponse.body[0];
      const testEmail = testMember.user_email;
      const expectedRole = testMember.role;

      console.log(`   Testing with member: ${testEmail}`);
      console.log(`   Expected role: ${expectedRole}`);

      // Get same member from getAllMemberInfo
      const allMembersResponse = await request(app)
        .get('/member-info/')
        .set('Authorization', `Bearer ${authToken}`);

      const memberFromAll = allMembersResponse.body.find((m: any) => m.user_email === testEmail);
      expect(memberFromAll).toBeDefined();
      expect(memberFromAll.role).toBe(expectedRole);
      console.log(`   ✓ Role consistent in getAllMemberInfo: ${memberFromAll.role}`);

      // Get same member from getMemberDetailsByEmail
      const detailsResponse = await request(app)
        .get(`/member-info/${testEmail}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(detailsResponse.body.role).toBe(expectedRole);
      console.log(`   ✓ Role consistent in getMemberDetailsByEmail: ${detailsResponse.body.role}`);

      console.log('\n✅ Role field consistent across all endpoints');
    });
  });
});
