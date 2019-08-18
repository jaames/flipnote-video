// Test library by converting a flipnote to x264 mp4 video
// Usage: 
// ppm to video:
// node ./test.js input.ppm input.mp4
// kwz to video:
// node ./test.js input.ppm input.mp4

const fs = require('fs');
const { parseFlipnote, FlipnoteConverter } = require('./index.js');

async function convert(inpath, outpath) {
  const hrstart = process.hrtime();

  const file = fs.readFileSync(inpath);
  // parse flipnote will return null if it doesn't identify the input as a ppm or kwz
  const flipnote = await parseFlipnote(file.buffer);
  // returns a node-fluent-ffmpeg command object
  // https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
  const converter = new FlipnoteConverter(flipnote);

  converter.outputOptions([
    '-c:v libx264',
    '-pix_fmt yuv420p',
  ]);
  converter.output('out.mp4');
  converter.run();

  converter.on('end', () => {
    console.log('Video saved!');
    const hrend = process.hrtime(hrstart)
    console.info('Execution time: %ds %dms', hrend[0], hrend[1] / 1000000)
  });

}

convert(process.argv[2], process.argv[3]);