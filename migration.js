const fs = require("fs");
const md5 = require("md5");
const MongoClient = require("mongodb").MongoClient;

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
    const migration = require(filePath);
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
    // TODO: it wouldn't hurt to preflight check this
    // migrate
    for (let i = 0; i < this.files.length; i++) {
      const currentFile = this.files[i];
      try {
        const migrationStatus = await migrationsCollection
          .find({ id: currentFile.id, removed: { $ne: true } })
          .toArray();
        // it's a new migration yay
        if (migrationStatus.length === 0) {
          await new Promise((resolve, reject) => {
            const result = currentFile.up(db, (error, result) => {
              if (error) return reject(error);
              return resolve(result);
            });
            if (result && result.then) {
              result.then(resolve).catch(reject);
            }
          });
          results.push({ id: currentFile.id, status: "success" });
          await migrationsCollection.insertOne({
            id: currentFile.id,
            checksum: currentFile.checksum,
            order: i,
            createdAt: new Date()
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
        if (currentFile.down) {
          try {
            await currentFile.down(db);
            results.push({
              id: currentFile.id,
              status: "error",
              type: "rollback-success"
            });
            return results;
          } catch (e) {
            results.push({
              id: currentFile.id,
              status: "error",
              type: "rollback-error"
            });
            return results;
          }
        }
        results.push({ id: currentFile.id, status: "error", type: "mongo" });
        console.log(e);
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

  /**
   * 1. removes migrations with files not existing any more
   * 2. updates the remaining files checksum and sort index
   * @param client
   * @returns {Promise<*>}
   * @private
   */
  async _cleanup(client) {
    const db = client.db(this.dbConfig.database);
    const migrationsCollection = db.collection(
      this.dbConfig.migrationCollection
    );
    // TODO: it wouldn't hurt to preflight check this
    const migrationIds = this.files.map(file => file.id);
    await migrationsCollection.update(
      { id: { $nin: migrationIds } },
      { $set: { removed: true } },
      { multi: true }
    );
    for (let i = 0; i < this.files.length; i++) {
      const currentFile = this.files[i];
      const migration = await migrationsCollection.findOne({
        id: currentFile.id,
        removed: { $ne: true }
      });
      if (migration) {
        await migrationsCollection.update(
          { id: currentFile.id, removed: { $ne: true } },
          {
            $set: {
              updatedAt: new Date(),
              checksum: currentFile.checksum,
              order: i
            }
          }
        );
      }
    }
    return await migrationsCollection
      .find({ removed: { $ne: true } })
      .toArray();
  }

  async cleanup() {
    // connect
    const client = await MongoClient.connect(this.dbConfig.url);
    // migrate
    const results = await this._cleanup(client);
    // disconnect
    await client.close(true);
    // exit
    return results;
  }
}

module.exports = Migration;
