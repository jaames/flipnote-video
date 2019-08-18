const fs = require('fs');
const tmp = require('tmp');
const FfmpegCommand = require('fluent-ffmpeg');
const FlipnoteFrameStream = require('./FlipnoteFrameStream');

class FlipnoteConverter extends FfmpegCommand {

  constructor(note, opts) {
    super();
    this.opts = {
      eq: false,
      ...opts
    };
    console.log(this.opts);
    const duration = (1 / note.framerate) * note.frameCount;
    const sampleRate = note.sampleRate;
    const bgmSampleRate = sampleRate * ((1 / note.bgmrate) / (1 / note.framerate));
    // set up frame stream
    // no frames are decoded until the ffmpeg command is run
    this.input(FlipnoteFrameStream.from(note))
    this.inputFormat('rawvideo')
    this.inputOptions([
      `-s ${ note.width }x${ note.height }`,
      `-r ${ note.framerate }`,
      `-pix_fmt rgb24`
    ]);
    this.duration(duration);

    // get a list of all tracksIds with a length larger than 0
    const activeTrackIds = Object.keys(note.soundMeta).filter(key => note.soundMeta[key].length > 0);

    // decode and set up audio tracks
    const audioTrackFiles = activeTrackIds.map((trackId) => {
      const tmpFile = tmp.fileSync();
      const pcmData = note.decodeAudio(trackId);
      // write audio to tmp file
      fs.writeSync(tmpFile.fd, pcmData);
      fs.closeSync(tmpFile.fd);
      // add ffmpeg commands
      this.input(tmpFile.name);
      this.inputFormat('s16le');
      this.inputOptions([
        `-ar ${ trackId === 'bgm' ? Math.floor(bgmSampleRate) : sampleRate }`,
        `-ac 1`,
      ]);
      return tmpFile;
    });

    let hasAudio = false;
    let soundEffectIndex = 1;
    let mixFilterInputs = [];
    let complexFilter = [];

    if ((activeTrackIds.indexOf('bgm') > -1)) {
      mixFilterInputs.push(`${ activeTrackIds.indexOf('bgm') + 1 }:0`);
      hasAudio = true;
    }

    note.decodeSoundFlags().forEach((frameFlags, frameIndex) => {
      const frameDelay = Math.round((1000 / note.framerate) * frameIndex);
      frameFlags.forEach((flag, flagIndex) => {
        const trackId = ['se1', 'se2', 'se3', 'se4'][flagIndex];
        const trackIndex = activeTrackIds.indexOf(trackId);
        // if the track is used and the flag is set
        if ((trackIndex > -1) && (flag)) {
          const outputName = `e${ soundEffectIndex }`;
          mixFilterInputs.push(outputName);
          complexFilter.push({
            filter: 'adelay', 
            options: frameDelay === 0 ? 1 : frameDelay,
            inputs: `${ trackIndex + 1 }:0:a`, 
            outputs: outputName
          });
          soundEffectIndex += 1;
          hasAudio = true;
        }
      });
    });

    if (hasAudio) {
      complexFilter.push({
        filter: 'amix',
        // volume has to be corrected after mixing
        // this can cause slight grain when mixing lots of sources... need to find a fix for that
        options: `inputs=${ mixFilterInputs.length },volume=${ mixFilterInputs.length }`,
        inputs: mixFilterInputs, 
        outputs: 'mixed'
      });
      this.complexFilter(complexFilter);
    }

    this.outputOptions(['-map 0:v', '-map [mixed]'])

    this.on('end', () => {
      // clean up audio files
      audioTrackFiles.forEach(tmpFile => tmpFile.removeCallback());
    });
  }

}

module.exports = FlipnoteConverter;