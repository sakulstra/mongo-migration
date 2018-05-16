import path from "path";
import { MongoClient } from "mongodb";
import Migration from "../migration";

const testConfig = {
  url: "mongodb://localhost/",
  database: "migrationTest",
  migrationCollection: "migrations"
};

describe("migration", () => {
  beforeEach(async () => {
    const client = await MongoClient.connect(testConfig.url);
    const db = client.db(testConfig.database);
    await db.dropDatabase();
    await client.close(true);
  });

  test("can add a file", () => {
    const testMigration = new Migration();
    testMigration.addFile(path.join(__dirname, "./migrations/a.js"));
    expect(testMigration.files).toHaveLength(1);
    expect(testMigration.files[0].id).toBe("a");
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
    const testMigration = new Migration(testConfig);
    testMigration.addFile(path.join(__dirname, "./migrations/a.js"));
    testMigration.addFile(path.join(__dirname, "./migrations/a.js"));
    const result = await testMigration.migrate();
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("success");
    expect(result[0].id).toBe("a");
    expect(result[1].status).toBe("skipped");
    expect(result[1].id).toBe("a");
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
});
