import Migration from '../migration';

describe('migration', () => {
  test('can run a migration', () => {
    Migration.addFile('a.js');
    const result = Migration.migrate();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('success');
  });
});