const Flipnote = require('flipnote.js/dist/node');
const FlipnoteConverter = require('./lib/FlipnoteConverter');

function parseFlipnote(source) {
  return new Promise((resolve, reject) => {
    Flipnote.parseSource(source)
      .then(resolve)
      .catch(() => { resolve(null) });
  });
}

module.exports = {
  parseFlipnote,
  FlipnoteConverter
};