const fs = require('fs');
const FfmpegCommand = require('fluent-ffmpeg');
const Flipnote = require('flipnote.js/dist/node');
const FlipnoteFrameStream = require('./FrameStream');

async function generateFfmpegProcess(buffer) {
  const note = await Flipnote.parseSource(buffer);
  const duration = (1 / note.framerate) * note.frameCount;

  // init streams
  // these don't actually convert any data until ffmpeg is run

  const command = new FfmpegCommand()
    .input(FlipnoteFrameStream.from(note))
    .inputFormat('rawvideo')
    .inputOptions([
      `-s ${ note.width }x${ note.height }`,
      `-r ${ note.framerate }`,
      `-pix_fmt rgb24`
    ])
    .duration(duration)

  return command;
}

const hrstart = process.hrtime();

const file = fs.readFileSync('./test4.kwz');
generateFfmpegProcess(file.buffer).then(converter => {

  converter.
    outputOptions([
      '-c:v libx264',
      '-pix_fmt yuv420p',
    ])
    .output('./test.mp4')
    .on('stderr', stderr => {
      console.log(stderr);
    })
    // .on('error', err => {
    //     console.log('Error rendering: %s', err.message);
    // })
    .on('end', () => {
        console.log('Video saved!');
        const hrend = process.hrtime(hrstart)
        console.info('Execution time: %ds %dms', hrend[0], hrend[1] / 1000000)
    })
    .run();

});
  