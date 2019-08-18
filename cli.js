#!/usr/bin/env node

const fs = require('fs');
const yargs = require('yargs');
const cliProgress = require('cli-progress');
const { parseFlipnote, FlipnoteConverter } = require('./index.js');

// split args
const [ bin, sourcePath, ...args ] = process.argv;
// everything after the -o flag goes to ffmpeg
const oFlag = args.indexOf('-o') + 1;
// get all args before the -o flag
const options = args.slice(0, oFlag === 0 ? args.length : oFlag);
// get all args after the -o flag
const outputOptions = args.slice(oFlag);

const cli = yargs
  // input
  .alias('i', 'input')
  .describe('i', 'Flipnote filename')
  .demandOption('i', 'Flipnote filename must be specified')
  // probe
  .describe('meta', 'Print Flipnote meta')
  .boolean('meta')
  // video filter
  .array('vfilter')
  .describe('vfilter', 'Add FFmpeg video filter')
  // scale filter shorthand
  .describe('scale', 'Scale output video')
  // equalize filter
  .describe('eq', 'Equalize audio')
  .boolean('eq')
  // output
  // output
  .alias('o', 'output')
  .boolean('o')
  .describe('o', 'Output options')
  .epilogue('For more information see the manual at github.com/jaames/flipnote-video')
  .help('help')
  .parse(options);

if (!fs.existsSync(cli.input)) {
  console.warn('Input file does not exist');
  process.exit(1);
}

const inputFile = fs.readFileSync(cli.input);

parseFlipnote(inputFile.buffer).then(flipnote => {

  const progressBar = new cliProgress.SingleBar({
    clearOnComplete: true
  });

  if (flipnote === null) {
    console.warn('Input file could not be parsed as a valid Flipnote .KWZ or .PPM file');
    process.exit(1);
  }

  if (cli.meta) {
    console.log('Showing metadata for', cli.input);
    console.info(flipnote.meta);
  }

  if (!cli.output && !cli.meta) {
    console.warn('Output options not specified');
    process.exit(1);
  }

  if (cli.output) {
    // returns a node-fluent-ffmpeg command object
    // https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
    const converter = new FlipnoteConverter(flipnote, {
      eq: cli.eq
    });

    if (cli.scale) {
      converter.videoFilters(`scale=iw*${ cli.scale }:-1:flags=neighbor`);
    }

    if (cli.vfilter) {
      cli.vfilter.forEach(filter => {
        converter.videoFilters(filter);
      });
    }

    // pass output options aside from the output filename to ffmpeg
    converter.outputOptions.apply(converter, outputOptions.slice(0, outputOptions.length - 1));
    // pass output filename
    converter.output(outputOptions[outputOptions.length - 1]);

    converter.on('start', () => {
      progressBar.start(flipnote.frameCount, 0);
    });

    converter.on('progress', (progress) => {
      progressBar.update(progress.frames);
    });

    converter.on('error', function(err, stdout, stderr) {
      progressBar.stop();
      console.log('Cannot convert Flipnote');
      console.log(err.message);
      process.exit(1);
    });

    converter.on('end', () => {
      progressBar.stop();
    });

    process.on('SIGINT', function() {
      progressBar.stop();
      console.log('Flipnote conversion cancelled');
      converter.kill('SIGSTOP');
      process.exit();
    });

    converter.run();
  }

});


