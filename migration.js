'use strict';
import { MongoClient } from 'mongodb';
import { File } from './file';

Array.prototype.unique = function() {
  return this.filter(function(value, index, self) {
    return self.indexOf(value) === index;
  });
};

export default class Migration {
  migrationFiles = [];
  currentMigrationStatus = [];
  /**
   * @param dbConfig | {migrationCollection: String, mongoUri: String, database: String}
   * @param options
   */
  constructor(dbConfig, options) {
    this.dbConfig = dbConfig;
    this.options = options;
  }

  addMigration(path) {
    this.migrationFiles.push(new File(path));
  }

  async _refreshMigrationCollection() {
    this.currentMigrationStatus = await this.db
      .collection(this.dbConfig.migrationCollection)
      .find({}, { sort: { order: 1 } })
      .toArray();
    return this.currentMigrationStatus;
  }
  /**
   * initial onetime setup for database connection
   * @returns {Promise<void>}
   * @private
   */
  async _setupClient() {
    this.client = await MongoClient.connect(this.dbConfig.mongoUri);
    this.db = this.client.db(this.dbConfig.database);
    await this._refreshMigrationCollection();
  }

  /**
   * process the results returned from the migration executor to save new stati in the database
   * @param file
   * @param index
   * @returns {Promise<void>}
   * @private
   */
  async _processResult(file, index) {
    await this.db.collection(this.dbConfig.migrationCollection).insert({
      id: file.migration.id,
      order: index,
      createdAt: new Date(),
      checksum: file.checksum
    });
  }

  _preFlightcheck() {
    if (
      this.migrationFiles.map(file => file.migration.id).unique().length !==
      this.migrationFiles.length
    ) {
      throw new Error('unique', 'migration files must have an unique id!');
    }
  }

  validateMigration(file, index) {
    // check if migration exists already in the db
    const currentMigration = this.currentMigrationStatus.find(
      current => current.id === file.migration.id
    );
    if (currentMigration) {
      // was migrated in a different order
      if (currentMigration.order !== index) {
        throw new Error('order-changed', 'migration was migrated in a different order');
      }
      // was migrated with a different checksum
      if (currentMigration.checksum !== file.checksum) {
        throw new Error('checksum-changed', 'migration was migrated with a different version');
      }
      return 'skipped';
    } else {
      // another migration was already migrated in that order slot
      if (index < this.currentMigrationStatus.length) {
        throw new Error('order-missing', 'another migraton was migrated in that place');
      }
    }
  }

  /**
   * actually run the migrations one by one
   * @returns {Promise<Array>}
   * @private
   */
  async _runMigrations() {
    const results = [];
    for (let i = 0; i < this.migrationFiles.length; i++) {
      try {
        const status = this.validateMigration(this.migrationFiles[i], i);
        if (status === 'skipped') {
          results.push({ id: this.migrationFiles[i].migration.id, status: 'skipped' });
          continue;
        }
        const r = await this.migrationFiles[i].migration.up(this.db);
        await this._processResult(this.migrationFiles[i], i);
        results.push({ id: this.migrationFiles[i].migration.id, status: 'success', result: r });
      } catch (e) {
        results.push({ id: this.migrationFiles[i].migration.id, status: 'error', error: e });
        return results;
      }
    }
    return results;
  }

  async migrate() {
    this._preFlightcheck();
    await this._setupClient();
    return await this._runMigrations();
  }

  async cleanupOrder() {
    this._preFlightcheck();
    await this._setupClient();
    const ids = this.migrationFiles.map(file => file.migration.id);
    await this.db.collection(this.dbConfig.migrationCollection).remove({ id: { $nin: ids } });
    return await this._refreshMigrationCollection();
  }

  async quit() {
    await this.client.close();
  }
}
