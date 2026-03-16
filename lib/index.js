'use strict';

const formats = require('./formats.js');

const name = 'mill';
const version = '1.0.0';
const description = 'Turn wheat sprint artifacts into shareable formats';

module.exports = {
  name,
  version,
  description,
  ...formats,
};
