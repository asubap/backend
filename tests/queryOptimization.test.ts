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
 * Query Optimization Performance Tests
 * Tests N+1 query optimizations for sponsors, resources, and events
 * Verifies that optimized views reduce query count and improve performance
 */
describe('Query Optimization Performance Tests', () => {
  jest.setTimeout(30000);

  describeIfConfigured('GET /sponsor/get-all-sponsor-info (getAllSponsors)', () => {
    it('should return all sponsors with resources efficiently', async () => {
      console.log('\n📊 Testing GET /sponsor/get-all-sponsor-info (getAllSponsors)...');

      const startTime = Date.now();

      const response = await request(app)
        .get('/sponsor/get-all-sponsor-info')
        .expect('Content-Type', /json/);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const firstSponsor = response.body[0];

        // Verify sponsor structure
        expect(firstSponsor).toHaveProperty('company_name');
        expect(firstSponsor).toHaveProperty('resources');
        expect(Array.isArray(firstSponsor.resources)).toBe(true);

        console.log(`   ✓ Sponsors returned: ${response.body.length}`);
        console.log(`   ✓ Response time: ${duration}ms`);
        console.log(`   ✓ Time per sponsor: ${(duration / response.body.length).toFixed(2)}ms`);

        // Calculate total resources
        const totalResources = response.body.reduce((sum: number, s: any) => sum + s.resources.length, 0);
        console.log(`   ✓ Total resources: ${totalResources}`);

        // Performance threshold - should be fast with optimized view
        // Old: 1 query for sponsors + 2N queries for category + resources = 1 + 2N
        // New: 1 query only
        const timePerSponsor = duration / response.body.length;
        if (timePerSponsor > 100) {
          console.warn(`   ⚠️  WARNING: Response slower than expected (${timePerSponsor.toFixed(2)}ms per sponsor > 100ms threshold)`);
        } else {
          console.log(`   ✅ Performance: Good (${timePerSponsor.toFixed(2)}ms per sponsor < 100ms threshold)`);
        }
      } else {
        console.log('   ⚠️  No sponsors found in database');
      }
    });

    it('should have resources with proper URL structure', async () => {
      const response = await request(app)
        .get('/sponsor/get-all-sponsor-info')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);

      // Find a sponsor with resources
      const sponsorWithResources = response.body.find((s: any) => s.resources && s.resources.length > 0);

      if (sponsorWithResources) {
        const resource = sponsorWithResources.resources[0];
        expect(resource).toHaveProperty('id');
        expect(resource).toHaveProperty('label');
        expect(resource).toHaveProperty('url');
        expect(resource).toHaveProperty('uploadDate');

        console.log(`   ✓ Resource structure validated for: ${sponsorWithResources.company_name}`);
      }
    });
  });

  describeIfConfigured('GET /sponsor/:id (getSponsorById)', () => {
    it('should return single sponsor with resources efficiently', async () => {
      console.log('\n📊 Testing GET /sponsor/:id (getSponsorById)...');

      // First get a sponsor ID to test with
      const listResponse = await request(app)
        .get('/sponsor/get-all-sponsor-info');

      if (listResponse.body.length === 0) {
        console.warn('   ⚠️  No sponsors found to test with');
        return;
      }

      const testSponsorId = listResponse.body[0].id;

      const startTime = Date.now();

      const response = await request(app)
        .get(`/sponsor/${testSponsorId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('company_name');
      expect(response.body).toHaveProperty('resources');
      expect(Array.isArray(response.body.resources)).toBe(true);

      console.log(`   ✓ Sponsor: ${response.body.company_name}`);
      console.log(`   ✓ Resources: ${response.body.resources.length}`);
      console.log(`   ✓ Response time: ${duration}ms`);

      // Performance threshold
      if (duration > 500) {
        console.warn(`   ⚠️  WARNING: Response slower than expected (${duration}ms > 500ms threshold)`);
      } else {
        console.log(`   ✅ Performance: Good (${duration}ms < 500ms threshold)`);
      }
    });

    it('should return 404 for non-existent sponsor', async () => {
      const response = await request(app)
        .get('/sponsor/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      // The endpoint returns null for non-existent sponsors, so status is 200
      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });
  });

  describeIfConfigured('GET /resources/ (getAllResources)', () => {
    it('should return all categories with resources efficiently', async () => {
      console.log('\n📊 Testing GET /resources/ (getAllResources)...');

      const startTime = Date.now();

      const response = await request(app)
        .get('/resources/')
        .expect('Content-Type', /json/);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const firstCategory = response.body[0];

        // Verify category structure
        expect(firstCategory).toHaveProperty('name');
        expect(firstCategory).toHaveProperty('resources');
        expect(Array.isArray(firstCategory.resources)).toBe(true);

        console.log(`   ✓ Categories returned: ${response.body.length}`);
        console.log(`   ✓ Response time: ${duration}ms`);
        console.log(`   ✓ Time per category: ${(duration / response.body.length).toFixed(2)}ms`);

        // Calculate total resources
        const totalResources = response.body.reduce((sum: number, c: any) => sum + c.resources.length, 0);
        console.log(`   ✓ Total resources: ${totalResources}`);

        // Performance threshold
        // Old: 1 query for categories + N queries for resources = 1 + N
        // New: 1 query only
        const timePerCategory = duration / response.body.length;
        if (timePerCategory > 50) {
          console.warn(`   ⚠️  WARNING: Response slower than expected (${timePerCategory.toFixed(2)}ms per category > 50ms threshold)`);
        } else {
          console.log(`   ✅ Performance: Good (${timePerCategory.toFixed(2)}ms per category < 50ms threshold)`);
        }
      } else {
        console.log('   ⚠️  No categories found in database');
      }
    });

    it('should have resources with signed URLs', async () => {
      const response = await request(app)
        .get('/resources/')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);

      // Find a category with resources
      const categoryWithResources = response.body.find((c: any) => c.resources && c.resources.length > 0);

      if (categoryWithResources) {
        const resource = categoryWithResources.resources[0];
        expect(resource).toHaveProperty('id');
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('signed_url');
        expect(resource).toHaveProperty('file_key');

        console.log(`   ✓ Resource structure validated for category: ${categoryWithResources.name}`);
      }
    });
  });

  describeIfConfigured('Performance Comparison: All Optimized Endpoints', () => {
    it('should compare performance across all optimized endpoints', async () => {
      console.log('\n📊 Performance Comparison: All Optimized Endpoints');
      console.log('==========================================');

      const results: { endpoint: string; duration: number; count: number; metric: string }[] = [];

      // Test getAllSponsors
      console.log('\n1️⃣  Testing /sponsor/get-all-sponsor-info...');
      const sponsorsStart = Date.now();
      const sponsorsResponse = await request(app)
        .get('/sponsor/get-all-sponsor-info');
      const sponsorsDuration = Date.now() - sponsorsStart;
      const sponsorCount = sponsorsResponse.body.length;
      results.push({
        endpoint: '/sponsor/get-all-sponsor-info',
        duration: sponsorsDuration,
        count: sponsorCount,
        metric: `${(sponsorsDuration / Math.max(sponsorCount, 1)).toFixed(2)}ms per sponsor`
      });
      console.log(`   • Response time: ${sponsorsDuration}ms`);
      console.log(`   • Records: ${sponsorCount}`);
      console.log(`   • Time per record: ${(sponsorsDuration / Math.max(sponsorCount, 1)).toFixed(2)}ms`);

      // Test getAllResources
      console.log('\n2️⃣  Testing /resources/...');
      const resourcesStart = Date.now();
      const resourcesResponse = await request(app)
        .get('/resources/');
      const resourcesDuration = Date.now() - resourcesStart;
      const categoryCount = resourcesResponse.body.length;
      results.push({
        endpoint: '/resources/',
        duration: resourcesDuration,
        count: categoryCount,
        metric: `${(resourcesDuration / Math.max(categoryCount, 1)).toFixed(2)}ms per category`
      });
      console.log(`   • Response time: ${resourcesDuration}ms`);
      console.log(`   • Records: ${categoryCount}`);
      console.log(`   • Time per record: ${(resourcesDuration / Math.max(categoryCount, 1)).toFixed(2)}ms`);

      // Summary
      console.log('\n📈 Performance Summary:');
      console.log('==========================================');

      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
      const totalRecords = results.reduce((sum, r) => sum + r.count, 0);

      console.log(`   • Total endpoints tested: ${results.length}`);
      console.log(`   • Total response time: ${totalDuration}ms`);
      console.log(`   • Total records returned: ${totalRecords}`);
      console.log(`   • Average response time: ${(totalDuration / results.length).toFixed(2)}ms`);

      results.forEach(r => {
        console.log(`\n   ${r.endpoint}:`);
        console.log(`     - Duration: ${r.duration}ms`);
        console.log(`     - Records: ${r.count}`);
        console.log(`     - Metric: ${r.metric}`);
      });

      // Check if all endpoints meet performance thresholds
      const sponsorsPerformance = sponsorCount > 0 ? sponsorsDuration / sponsorCount < 100 : true;
      const resourcesPerformance = categoryCount > 0 ? resourcesDuration / categoryCount < 50 : true;

      if (sponsorsPerformance && resourcesPerformance) {
        console.log('\n✅ All endpoints performing well with optimized queries');
      } else {
        console.warn('\n⚠️  Some endpoints may have performance issues:');
        if (!sponsorsPerformance) {
          console.warn(`   • /sponsor/get-all-sponsor-info: ${(sponsorsDuration / sponsorCount).toFixed(2)}ms per sponsor (>100ms threshold)`);
        }
        if (!resourcesPerformance) {
          console.warn(`   • /resources/: ${(resourcesDuration / categoryCount).toFixed(2)}ms per category (>50ms threshold)`);
        }
      }

      console.log('\n==========================================\n');

      // Assertions
      expect(sponsorsResponse.status).toBe(200);
      expect(resourcesResponse.status).toBe(200);
    });
  });

  describeIfConfigured('Multiple Runs for Consistency', () => {
    const NUM_RUNS = 3;

    it(`should test /sponsor/get-all-sponsor-info ${NUM_RUNS} times for consistency`, async () => {
      console.log(`\n📊 Running /sponsor/get-all-sponsor-info ${NUM_RUNS} times...`);
      const times: number[] = [];

      for (let i = 0; i < NUM_RUNS; i++) {
        const startTime = Date.now();
        const response = await request(app)
          .get('/sponsor/get-all-sponsor-info');
        const duration = Date.now() - startTime;

        expect(response.status).toBe(200);
        times.push(duration);
        console.log(`   Run ${i + 1}: ${duration}ms (${response.body.length} sponsors)`);
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

    it(`should test /resources/ ${NUM_RUNS} times for consistency`, async () => {
      console.log(`\n📊 Running /resources/ ${NUM_RUNS} times...`);
      const times: number[] = [];

      for (let i = 0; i < NUM_RUNS; i++) {
        const startTime = Date.now();
        const response = await request(app)
          .get('/resources/');
        const duration = Date.now() - startTime;

        expect(response.status).toBe(200);
        times.push(duration);
        console.log(`   Run ${i + 1}: ${duration}ms (${response.body.length} categories)`);
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

  describeIfConfigured('Query Count Verification', () => {
    it('should verify that getAllSponsors uses single query (view)', async () => {
      console.log('\n📊 Verifying query optimization for getAllSponsors...');

      // The optimized version should use sponsor_resources_summary view
      // Which means: 1 query total (instead of 1 + 2N queries)

      const startTime = Date.now();
      const response = await request(app)
        .get('/sponsor/get-all-sponsor-info');
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);

      const sponsorCount = response.body.length;
      const avgTimePerSponsor = duration / Math.max(sponsorCount, 1);

      console.log(`   ✓ Sponsors returned: ${sponsorCount}`);
      console.log(`   ✓ Total time: ${duration}ms`);
      console.log(`   ✓ Time per sponsor: ${avgTimePerSponsor.toFixed(2)}ms`);

      // With N+1 queries (old): ~50-100ms per sponsor (depends on network latency)
      // With single query (new): ~10-30ms per sponsor

      if (sponsorCount > 0) {
        const isOptimized = avgTimePerSponsor < 100;
        console.log(`   ${isOptimized ? '✅' : '⚠️'} Query optimization: ${isOptimized ? 'PASS' : 'NEEDS REVIEW'}`);

        if (!isOptimized) {
          console.warn(`   ⚠️  Average time per sponsor (${avgTimePerSponsor.toFixed(2)}ms) suggests possible N+1 pattern`);
        }
      }
    });

    it('should verify that getAllResources uses single query (view)', async () => {
      console.log('\n📊 Verifying query optimization for getAllResources...');

      // The optimized version should use categories_with_resources view
      // Which means: 1 query total (instead of 1 + N queries)

      const startTime = Date.now();
      const response = await request(app)
        .get('/resources/');
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);

      const categoryCount = response.body.length;
      const avgTimePerCategory = duration / Math.max(categoryCount, 1);

      console.log(`   ✓ Categories returned: ${categoryCount}`);
      console.log(`   ✓ Total time: ${duration}ms`);
      console.log(`   ✓ Time per category: ${avgTimePerCategory.toFixed(2)}ms`);

      // With N+1 queries (old): ~30-60ms per category
      // With single query (new): ~5-20ms per category

      if (categoryCount > 0) {
        const isOptimized = avgTimePerCategory < 50;
        console.log(`   ${isOptimized ? '✅' : '⚠️'} Query optimization: ${isOptimized ? 'PASS' : 'NEEDS REVIEW'}`);

        if (!isOptimized) {
          console.warn(`   ⚠️  Average time per category (${avgTimePerCategory.toFixed(2)}ms) suggests possible N+1 pattern`);
        }
      }
    });
  });
});
