## flipnote-video

A Node.js library to convert Flipnotes to video

## Prerequisites

* [Node.js environment](https://nodejs.org) 
* [FFmpeg](https://ffmpeg.org/) - at least version 3.4 or above. You may want to check the [node-fluent-ffmpeg readme](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#prerequisites) for more information.

## Usage as a Command Line Tool

### Get started

Use npm to install flipnote-video globally:

```bash
npm i -g flipnote-video --save
```

### Examples

#### Convert Flipnote to MP4

```bash
flipnote-video -i flipnote.ppm -o -c:v libx264 -c:a aac -pix_fmt yuv420p video.mp4
```

#### Show Flipnote metadata

```bash
flipnote-video -i flipnote.ppm --meta
```

## Usage as a Library

### Get started

Use npm to add flipnote-video into your project:

```bash
npm i flipnote-video --save
```

### Code Examples

#### Convert Flipnote to MP4

```js
const fs = require('fs');
const { parseFlipnote, FlipnoteConverter } = require('flipnote-video');

async function convert(inpath, outpath) {
  // read input file
  const file = fs.readFileSync(inpath);
  // parse file as flipnote
  const flipnote = await parseFlipnote(file.buffer);
  // FlipnoteConverter extends node-fluent-ffmpeg's command object
  // https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
  const converter = new FlipnoteConverter(flipnote);

  // Web-friendly MP4 codec settings
  converter.outputOptions([
    '-c:v libx264',
    '-c:a aac',
    '-pix_fmt yuv420p',
  ]);
  converter.output(outpath);
  converter.run();
}

convert('./flipnote.ppm', './video.mp4');
```