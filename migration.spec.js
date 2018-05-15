import path from 'path';
import { Migration } from './migration';
import { MongoClient } from 'mongodb';

const TEST_DB = 'migrationTest';
let migration = null;
let testClient = null;

describe('Migration', () => {
  beforeAll(async () => {
    testClient = await MongoClient.connect('mongodb://localhost/');
  });

  beforeEach(async () => {
    migration = new Migration({
      migrationCollection: 'testMigrations',
      mongoUri: 'mongodb://localhost/',
      database: TEST_DB
    });
    expect(migration).toBeInstanceOf(Migration);
    await testClient.db(TEST_DB).dropDatabase();
  });

  test('can add test files', () => {
    migration.addMigration(path.join(__dirname, './tests/1.js'));
    migration.addMigration(path.join(__dirname, './tests/2.js'));
    migration.addMigration(path.join(__dirname, './tests/3.js'));
    expect(migration.migrationFiles).toHaveLength(3);
  });

  test('to successfully Setup connection', async () => {
    await migration._setupClient();
    await expect(migration.client).toBeTruthy();
  });

  test('to throw when files are not unique', async () => {
    migration.addMigration(path.join(__dirname, './tests/1.js'));
    migration.addMigration(path.join(__dirname, './tests/1.js'));
    migration.addMigration(path.join(__dirname, './tests/2.js'));
    await expect(migration.migrate()).rejects.toThrow(/unique/);
  });

  test('to run migrations', async () => {
    migration.addMigration(path.join(__dirname, './tests/1.js'));
    migration.addMigration(path.join(__dirname, './tests/2.js'));
    migration.addMigration(path.join(__dirname, './tests/3.js'));
    await migration.migrate();
    const testCollection = await testClient
      .db(TEST_DB)
      .collection('tests')
      .find()
      .toArray();
    expect(testCollection).toHaveLength(1);
    expect(testCollection[0].a).toBe(3);
  });

  test('to thow when order changed 1', async () => {
    migration.addMigration(path.join(__dirname, './tests/1.js'));
    migration.addMigration(path.join(__dirname, './tests/2.js'));
    await migration.migrate();
    const migration2 = new Migration({
      migrationCollection: 'testMigrations',
      mongoUri: 'mongodb://localhost/',
      database: TEST_DB
    });
    migration2.addMigration(path.join(__dirname, './tests/2.js'));
    migration2.addMigration(path.join(__dirname, './tests/1.js'));
    const result = await migration2.migrate();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'test2',
      status: 'error',
      error: new Error('order-changed')
    });
  });

  test('to thow when order changed 2', async () => {
    migration.addMigration(path.join(__dirname, './tests/1.js'));
    migration.addMigration(path.join(__dirname, './tests/2.js'));
    await migration.migrate();
    const migration2 = new Migration({
      migrationCollection: 'testMigrations',
      mongoUri: 'mongodb://localhost/',
      database: TEST_DB
    });
    migration2.addMigration(path.join(__dirname, './tests/1.js'));
    migration2.addMigration(path.join(__dirname, './tests/3.js'));
    const result = await migration2.migrate();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'test1',
      status: 'skipped'
    });
    expect(result[1]).toEqual({
      id: 'test3',
      status: 'error',
      error: new Error('order-missing')
    });
  });

  test('to thow when checksum changed', async () => {
    migration.addMigration(path.join(__dirname, './tests/1.js'));
    await migration.migrate();
    const migration2 = new Migration({
      migrationCollection: 'testMigrations',
      mongoUri: 'mongodb://localhost/',
      database: TEST_DB
    });
    migration2.addMigration(path.join(__dirname, './tests/1_b.js'));
    const result = await migration2.migrate();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'test1',
      status: 'error',
      error: new Error('checksum-changed')
    });
  });

  test('to cleanup', async () => {
    migration.addMigration(path.join(__dirname, './tests/1.js'));
    migration.addMigration(path.join(__dirname, './tests/2.js'));
    await migration.migrate();
    const migration2 = new Migration(
      {
        migrationCollection: 'testMigrations',
        mongoUri: 'mongodb://localhost/',
        database: TEST_DB
      },
      { cleanup: true }
    );
    migration2.addMigration(path.join(__dirname, './tests/1.js'));
    // will remove migration nr 2 but not execute nr 3
    migration2.addMigration(path.join(__dirname, './tests/3.js'));
    await expect(migration2.cleanupOrder()).resolves.toBeTruthy();
    expect(migration2.currentMigrationStatus).toHaveLength(1);
  });

  test('to fail and exit', async () => {
    migration.addMigration(path.join(__dirname, './tests/1.js'));
    migration.addMigration(path.join(__dirname, './tests/error.js'));
    migration.addMigration(path.join(__dirname, './tests/3.js'));
    const result = await migration.migrate();
    expect(result).toHaveLength(2);
    expect(result[1].id).toEqual('error');
    expect(result[1].status).toEqual('error');
  });

  afterAll(async () => {
    await testClient.db(TEST_DB).dropDatabase();
    migration.quit();
  });
});
