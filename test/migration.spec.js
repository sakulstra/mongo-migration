import path from "path";
import Migration from "../migration";

describe("migration", () => {
  test("can add a file", () => {
    const testMigration = new Migration();
    testMigration.addFile(path.join(__dirname, "./migrations/a.js"));
    expect(testMigration.files).toHaveLength(1);
    expect(testMigration.files[0].id).toBe("a");
  });

  test("can run migrations", async () => {
    const testMigration = new Migration({
      url: "mongodb://localhost/",
      database: "migrationTest",
      migrationCollection: "migrations"
    });
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
    const testMigration = new Migration({
      url: "mongodb://localhost/",
      database: "migrationTest",
      migrationCollection: "migrations"
    });
    testMigration.addFile(path.join(__dirname, "./migrations/a.js"));
    testMigration.addFile(path.join(__dirname, "./migrations/a.js"));
    const result = await testMigration.migrate();
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("success");
    expect(result[0].id).toBe("a");
    expect(result[1].status).toBe("skipped");
    expect(result[1].id).toBe("a");
  });
});
