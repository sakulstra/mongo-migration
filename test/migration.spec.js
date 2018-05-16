import path from 'path';
import Migration from '../migration';

describe('migration', () => {
  test('can add a file', () => {
    const testMigration = new Migration();
    testMigration.addFile(path.join(__dirname, './migrations/a.js'));
    expect(testMigration.files).toHaveLength(1);
    expect(testMigration.files[0].id).toBe('a');
  })

  test('can run a migration', async () => {
    const testMigration = new Migration({
      url: 'mongodb://localhost/',
      database: 'migrationTest',
      migrationCollection: 'migrations'
    });
    testMigration.addFile(path.join(__dirname, './migrations/a.js'));
    const result = await testMigration.migrate();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('success');
  });
});