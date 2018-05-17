import path from "path";
import { MongoClient } from "mongodb";
import Migration from "../migration";

const testConfig = {
  url: "mongodb://localhost/",
  database: "migrationTest",
  migrationCollection: "migrations"
};

let client = null;
let db = null;

describe("migration", () => {
  beforeAll(async () => {
    client = await MongoClient.connect(testConfig.url);
  });

  beforeEach(async () => {
    db = client.db(testConfig.database);
    await db.dropDatabase();
  });

  test("can add a file", () => {
    const testMigration = new Migration();
    testMigration.addFile(path.join(__dirname, "./migrations/a.js"));
    expect(testMigration.files).toHaveLength(1);
    expect(testMigration.files[0].id).toBe("a");
  });

  test("can add multiple files at once", () => {
    const testMigration = new Migration();
    testMigration.addFiles([
      path.join(__dirname, "./migrations/a.js"),
      path.join(__dirname, "./migrations/b.js")
    ]);
    expect(testMigration.files).toHaveLength(2);
    expect(testMigration.files[0].id).toBe("a");
    expect(testMigration.files[1].id).toBe("b");
  });

  test("can run migrations", async () => {
    const testMigration = new Migration(testConfig);
    testMigration.addFile(path.join(__dirname, "./migrations/a.js"));
    testMigration.addFile(path.join(__dirname, "./migrations/b.js"));
    const result = await testMigration.migrate();
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("success");
    expect(result[0].id).toBe("a");
    expect(result[1].status).toBe("success");
    expect(result[1].id).toBe("b");
  });

  test("skipps already migrated migrations", async () => {
    const testMigration1 = new Migration(testConfig);
    testMigration1.addFile(path.join(__dirname, "./migrations/a.js"));
    const result1 = await testMigration1.migrate();
    expect(result1).toHaveLength(1);
    expect(result1[0].status).toBe("success");
    expect(result1[0].id).toBe("a");
    const testMigration2 = new Migration(testConfig);
    testMigration2.addFile(path.join(__dirname, "./migrations/a.js"));
    const result2 = await testMigration2.migrate();
    expect(result2[0].status).toBe("skipped");
    expect(result2[0].id).toBe("a");
  });

  test("aborts and reports on fileChange", async () => {
    const testMigration = new Migration(testConfig);
    testMigration.addFile(path.join(__dirname, "./migrations/a.js"));
    testMigration.addFile(path.join(__dirname, "./migrations/a_modified.js"));
    testMigration.addFile(path.join(__dirname, "./migrations/b.js"));
    const result = await testMigration.migrate();
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("success");
    expect(result[0].id).toBe("a");
    expect(result[1].status).toBe("error");
    expect(result[1].type).toBe("checksum-mismatch");
    expect(result[1].id).toBe("a");
  });

  test("aborts and reports on orderChange", async () => {
    const testMigration1 = new Migration(testConfig);
    testMigration1.addFile(path.join(__dirname, "./migrations/a.js"));
    testMigration1.addFile(path.join(__dirname, "./migrations/b.js"));
    await testMigration1.migrate();
    const testMigration2 = new Migration(testConfig);
    testMigration2.addFile(path.join(__dirname, "./migrations/b.js"));
    testMigration2.addFile(path.join(__dirname, "./migrations/a.js"));
    const result = await testMigration2.migrate();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("error");
    expect(result[0].id).toBe("b");
    expect(result[0].type).toBe("order-mismatch");
  });

  test("executes down function on error", async () => {
    const testMigration = new Migration(testConfig);
    testMigration.addFile(path.join(__dirname, "./migrations/fail.js"));
    const result = await testMigration.migrate();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("error");
    expect(result[0].type).toBe("mongo");
    expect(result[0].id).toBe("b");
    const testData = await db
      .collection("test")
      .find({})
      .toArray();
    expect(testData).toHaveLength(0);
  });

  test("executes down function on error", async () => {
    const testMigration = new Migration(testConfig);
    testMigration.addFile(path.join(__dirname, "./migrations/fail_twice.js"));
    const result = await testMigration.migrate();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("error");
    expect(result[0].type).toBe("rollback");
    expect(result[0].id).toBe("b");
    const testData = await db
      .collection("test")
      .find({})
      .toArray();
    expect(testData).toHaveLength(0);
  });

  afterAll(async () => {
    await client.close(true);
  });
});
