import fs from 'fs';
import md5 from 'md5';

class File {
  constructor(path) {
    expect(path).toBeTruthy();
    this.path = path;
    this.content = fs.readFileSync(path, { encoding: 'utf8' });
    this.checksum = md5(this.content);
    this.migration = require(path).default;
    // ensure id and up functions are provided
    expect(this.migration).toHaveProperty('id');
    expect(this.migration).toHaveProperty('up');
  }
}

export { File };
