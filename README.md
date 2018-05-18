[![Greenkeeper badge](https://badges.greenkeeper.io/sakulstra/mongo-migration.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.com/sakulstra/mongo-migration.svg?branch=master)](https://travis-ci.com/sakulstra/mongo-migration)
[![codecov](https://codecov.io/gh/sakulstra/mongo-migration/branch/master/graph/badge.svg)](https://codecov.io/gh/sakulstra/mongo-migration)

# <name not decided yet>

Simple, yet powerful mongo migration package

### Features

* tested right fromm the beginning
* mongo-v3

### Usage

Sample migration

```js
const config = {
  url: "mongodb://localhost/",
  database: "migrationTest",
  migrationCollection: "migrations"
};

const testMigration = new Migration(testConfig);
testMigration.addFile(path.join(__dirname, "./migrations/a.js"));
testMigration.addFile(path.join(__dirname, "./migrations/b.js"));
const result = await testMigration.migrate();
```

Migration cleanup
Removes non existent migrations from the migrations database and refreshes the hashes of already executed migrations. **It doesn't actually run any migrations.**

:warning: This is a feature you shouldn't be required to use, but there might be rare cases where it get's useful.:warning:

```js
const config = {
  url: "mongodb://localhost/",
  database: "migrationTest",
  migrationCollection: "migrations"
};

const testMigration = new Migration(testConfig);
testMigration.addFile(path.join(__dirname, "./migrations/a.js"));
testMigration.addFile(path.join(__dirname, "./migrations/b.js"));
const result = await testMigration.cleanup();
```
