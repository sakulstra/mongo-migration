import fs from 'fs';
import md5 from 'md5';

class File {
  constructor(path) {
    expect(path).toBeTruthy();
    this.path = path;
    this.content = fs.readFileSync(path, { encoding: 'utf8' });
    // when windows and linux users are running migrations on the same db there's a good chance the content hash will return different results as \n is transformed to \r\n
    // so let's just remove the \r to save us some struggle
    this.checksum = md5(this.content.replace(/[\r]/g, ''));
    this.migration = require(path).default;
    // ensure id and up functions are provided
    expect(this.migration).toHaveProperty('id');
    expect(this.migration).toHaveProperty('up');
  }
}

export { File };
