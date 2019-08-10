const { Readable } = require('stream');

class FlipnoteFrameStream extends Readable {

  constructor(note, streamOpts) {
    super(streamOpts);
    this.note = note;
    this.frameWidth = note.width;
    this.frameHeight = note.height;
    this.frameCount = note.frameCount;
    this.frameIndex = 0;
    this.prevBuffer = null;
  }

  static from(note) {
    return new FlipnoteFrameStream(note);
  }

  getFrameImage(frameIndex) {
    const imageBuffer = Buffer.alloc(this.frameWidth * this.frameHeight * 3);
    const framePixels = this.note.getFramePixels(frameIndex);
    const framePalette = this.note.getFramePalette(frameIndex);

    for (let pixelIndex = 0, outputOffset = 0; pixelIndex < framePixels.length; pixelIndex += 1, outputOffset += 3) {
      let pixel = framePixels[pixelIndex];
      let color = framePalette[pixel];
      imageBuffer[outputOffset] = color[0];
      imageBuffer[outputOffset + 1] = color[1];
      imageBuffer[outputOffset + 2] = color[2];
    }

    return imageBuffer;
  }

  _read(size=1024) {
    let ready = true;
    let bufferSize = this.prevBuffer ? this.prevBuffer.length : 0;
    let streamBuffer;

    if (bufferSize === size) {
      ready = this.push(this.prevBuffer);
      this.prevBuffer = null;
      return;
    }

    if (bufferSize >= size) {
      streamBuffer = this.prevBuffer.slice(0, size - bufferSize);
      this.prevBuffer = this.prevBuffer.slice(size - bufferSize);
      ready = this.push(streamBuffer);
      return;
    }

    if (bufferSize > 0) {
      ready = this.push(this.prevBuffer);
      this.prevBuffer = null;
      if (!ready) {
        return;
      }
    }

    while (ready && bufferSize <= size) {
      if (this.frameIndex >= this.frameCount) {
        // end the stream
        return this.push(null);
      }

      const frameImage = this.getFrameImage(this.frameIndex);

      if (frameImage.length + bufferSize > size) {
        streamBuffer = frameImage.slice(0, size - bufferSize);
        this.prevBuffer = frameImage.slice(size - bufferSize);
      } else {
        streamBuffer = frameImage;
      }

      bufferSize += streamBuffer.length;
      ready = this.push(streamBuffer);
      this.frameIndex += 1;
    }
  }
};

module.exports = FlipnoteFrameStream;