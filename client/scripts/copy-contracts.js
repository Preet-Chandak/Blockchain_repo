const fs = require('fs-extra');
const path = require('path');

const source = path.resolve(__dirname, '../../build/contracts');
const destination = path.resolve(__dirname, '../src/contracts');

fs.copySync(source, destination, { overwrite: true });
console.log('Contracts copied to frontend successfully!');