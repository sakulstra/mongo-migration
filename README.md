# <name not decided yet>

Simple, yet powerful mongo migration package

### Features

* tested right fromm the beginning
* mongo-v3

### Usage

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
