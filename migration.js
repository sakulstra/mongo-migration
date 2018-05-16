import {MongoClient} from 'mongodb';

class Migration {
  files = [];
  dbConfig = {
    url: 'mongodb://localhost/',
    database: 'migrationTest',
    migrationCollection: 'migrations'
  };

  constructor(dbConfig) {
    this.dbConfig = dbConfig;
  }

  addFile(filePath) {
    const migration = require(filePath).default;
    this.files.push(migration)
  }

  async migrate() {
    // connect
    const client = await MongoClient.connect(this.dbConfig.url);
    const db = client.db(this.dbConfig.database);

    const results = [];
    // migrate
    for (let i = 0; i < this.files.length; i++) {
      try {
        const result = await this.files[i].up(db);
        results.push({id: this.files[i].id, status: 'success'});
      } catch(e) {
        results.push({id: this.files[i].id, status: 'error'});
      }
    }
    // disconnect
    client.close();
    return results;
  }
}

export default Migration;