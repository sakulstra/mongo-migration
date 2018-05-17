import fs from "fs";
import md5 from "md5";
import { MongoClient } from "mongodb";

class Migration {
  files = [];
  dbConfig = {
    url: "mongodb://localhost/",
    database: "migrationTest",
    migrationCollection: "migrations"
  };

  constructor(dbConfig) {
    this.dbConfig = dbConfig;
  }

  addFile(filePath) {
    const migration = require(filePath).default;
    const content = fs.readFileSync(filePath, { encoding: "utf8" });
    // when windows and linux users are running migrations on the same db there's a good chance the content hash will return different results as \n is transformed to \r\n
    // so let's just remove the \r to save us some struggle
    migration.checksum = md5(content.replace(/[\r]/g, ""));
    migration.path = filePath;
    this.files.push(migration);
  }

  addFiles(filePaths) {
    filePaths.forEach(filePath => this.addFile(filePath));
  }

  async _migrate(client) {
    const db = client.db(this.dbConfig.database);
    const migrationsCollection = db.collection(
      this.dbConfig.migrationCollection
    );
    const results = [];
    // migrate
    for (let i = 0; i < this.files.length; i++) {
      const currentFile = this.files[i];
      try {
        const migrationStatus = await migrationsCollection
          .find({ id: currentFile.id })
          .toArray();
        // it's a new migration yay
        if (migrationStatus.length === 0) {
          const result = await currentFile.up(db);
          results.push({ id: currentFile.id, status: "success" });
          await migrationsCollection.insertOne({
            id: currentFile.id,
            checksum: currentFile.checksum,
            order: i
          });
        } else {
          if (currentFile.checksum !== migrationStatus[0].checksum) {
            results.push({
              id: currentFile.id,
              status: "error",
              type: "checksum-mismatch"
            });
            return results;
          } else if (i !== migrationStatus[0].order) {
            results.push({
              id: currentFile.id,
              status: "error",
              type: "order-mismatch"
            });
            return results;
          } else {
            results.push({ id: currentFile.id, status: "skipped" });
          }
        }
      } catch (e) {
        try {
          const result = currentFile.down && (await currentFile.down(db));
        } catch (e) {
          results.push({
            id: currentFile.id,
            status: "error",
            type: "rollback"
          });
          return results;
        }
        results.push({ id: currentFile.id, status: "error", type: "mongo" });
        return results;
      }
    }
    return results;
  }

  async migrate() {
    // connect
    const client = await MongoClient.connect(this.dbConfig.url);
    // migrate
    const results = await this._migrate(client);
    // disconnect
    await client.close(true);
    // exit
    return results;
  }
}

export default Migration;
