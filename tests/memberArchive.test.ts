import request from 'supertest';
import app from '../src/app';
import dotenv from 'dotenv';

dotenv.config();

const authToken = process.env.TEST_AUTH_TOKEN || '';
const testMemberEmail = process.env.TEST_MEMBER_EMAIL || '';

if (!authToken || !testMemberEmail) {
  console.warn('\n⚠️  TEST_AUTH_TOKEN or TEST_MEMBER_EMAIL not set in .env');
  console.warn('   Tests will be skipped. See tests/README.md for setup instructions.\n');
}

// Skip all tests if environment not configured
const describeIfConfigured = (authToken && testMemberEmail) ? describe : describe.skip;

describe('Member Archive/Restore API', () => {

  describeIfConfigured('POST /member-info/:email/archive', () => {
    it('should archive a member successfully', async () => {
      const response = await request(app)
        .post(`/member-info/${testMemberEmail}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('archived successfully');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/member-info/${testMemberEmail}/archive`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 without email parameter', async () => {
      const response = await request(app)
        .post('/member-info//archive')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should not archive an already archived member', async () => {
      // Archive once
      await request(app)
        .post(`/member-info/${testMemberEmail}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to archive again - should still return 200 but have no effect
      const response = await request(app)
        .post(`/member-info/${testMemberEmail}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });
  });

  describeIfConfigured('GET /member-info/archived', () => {
    it('should get list of archived members', async () => {
      const response = await request(app)
        .get('/member-info/archived')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Should contain our test member
      const archivedMember = response.body.find((m: any) => m.email === testMemberEmail);
      expect(archivedMember).toBeDefined();
      expect(archivedMember).toHaveProperty('deleted_at');
      expect(archivedMember.deleted_at).not.toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/member-info/archived')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });

  describeIfConfigured('POST /member-info/:email/restore', () => {
    it('should restore an archived member successfully', async () => {
      const response = await request(app)
        .post(`/member-info/${testMemberEmail}/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('restored successfully');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/member-info/${testMemberEmail}/restore`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 without email parameter', async () => {
      const response = await request(app)
        .post('/member-info//restore')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should not restore a non-archived member', async () => {
      // Restore once (should be already restored from previous test)
      await request(app)
        .post(`/member-info/${testMemberEmail}/restore`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to restore again - should still return 200 but have no effect
      const response = await request(app)
        .post(`/member-info/${testMemberEmail}/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });
  });

  describeIfConfigured('Integration: Archive → Verify → Restore → Verify', () => {
    it('should complete full archive and restore cycle', async () => {
      // 1. Archive the member
      const archiveResponse = await request(app)
        .post(`/member-info/${testMemberEmail}/archive`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(archiveResponse.status).toBe(200);

      // 2. Verify they appear in archived list
      const archivedListResponse = await request(app)
        .get('/member-info/archived')
        .set('Authorization', `Bearer ${authToken}`);
      expect(archivedListResponse.status).toBe(200);
      const isInArchived = archivedListResponse.body.some((m: any) => m.email === testMemberEmail);
      expect(isInArchived).toBe(true);

      // 3. Restore the member
      const restoreResponse = await request(app)
        .post(`/member-info/${testMemberEmail}/restore`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(restoreResponse.status).toBe(200);

      // 4. Verify they DON'T appear in archived list anymore
      const archivedAfterRestoreResponse = await request(app)
        .get('/member-info/archived')
        .set('Authorization', `Bearer ${authToken}`);
      expect(archivedAfterRestoreResponse.status).toBe(200);
      const isStillInArchived = archivedAfterRestoreResponse.body.some((m: any) => m.email === testMemberEmail);
      expect(isStillInArchived).toBe(false);
    });
  });
});
