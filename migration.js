class Migration {
  files = [];

  addFile(filePath) {
    const migration = require(filePath).default;
    this.files.push(migration)
  }
}

export default Migration;