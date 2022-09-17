/*
 * crack
 */

const path = require("path");
const Jimp = require("jimp");

const decodeBase64DataUri = (dataString) => {
  const matches = dataString.match(/^data:([^;]+);([^,]+),(.+)$/);
  const type = matches[1];
  const encoding = matches[2];
  const bufferStr = matches[3];
  if (!type || !encoding || !bufferStr) {
    throw new Error("Invalid input string");
  }
  return {
    type,
    encoding,
    buffer: Buffer.from(bufferStr, encoding),
  };
};

const toRGB = (color) => {
  // return Jimp.intToRGBA(color);
  return {
    r: (color >> 24) & 255,
    g: (color >> 16) & 255,
    b: (color >> 8) & 255,
  };
};

const round = (number, decimals) => {
  const scale = Math.pow(10, decimals);
  return Math.round(number * scale) / scale;
};

const crack = async ({ groundDataString, brickDataString }) => {
  let groundBuf;
  try {
    groundBuf = decodeBase64DataUri(groundDataString).buffer;
  } catch (ex) {
    groundBuf = Buffer.from(groundDataString, "base64");
  }

  let brickBuf;
  try {
    brickBuf = decodeBase64DataUri(brickDataString).buffer;
  } catch (ex) {
    brickBuf = Buffer.from(brickDataString, "base64");
  }

  const testColor = Jimp.cssColorToHex("#FF0000");

  // border pixels of brick
  const brick = await Jimp.read(brickBuf);
  const brickWidth = brick.getWidth();
  const brickHeight = brick.getHeight();
  const borderPixels = [];
  // scan x
  for (let brickX = 0; brickX < brickWidth; brickX++) {
    const yPixels = [];
    for (let brickY = 0; brickY < brickHeight; brickY++) {
      const color = brick.getPixelColor(brickX, brickY);
      if (color) {
        const rgb = toRGB(color);
        if (rgb.r > 5 && rgb.g > 5 && rgb.b > 5) {
          yPixels.push({
            brickY,
            color: rgb,
          });
        }
      }
    }
    if (yPixels.length > 0) {
      const pixel = yPixels[0];
      borderPixels.push({
        x: brickX,
        y: pixel.brickY,
        color: pixel.color,
      });
    }
    if (yPixels.length > 1) {
      const pixel = yPixels[yPixels.length - 1];
      borderPixels.push({
        x: brickX,
        y: pixel.brickY,
        color: pixel.color,
      });
    }
  }
  // scan y
  for (let brickY = 0; brickY < brickHeight; brickY++) {
    const xPixels = [];
    for (let brickX = 0; brickX < brickHeight; brickX++) {
      const color = brick.getPixelColor(brickX, brickY);
      if (color) {
        const rgb = toRGB(color);
        if (rgb.r > 5 && rgb.g > 5 && rgb.b > 5) {
          xPixels.push({
            brickX,
            color: rgb,
          });
        }
      }
    }
    if (xPixels.length > 0) {
      const pixel = xPixels[0];
      borderPixels.push({
        x: pixel.brickX,
        y: brickY,
        color: pixel.color,
      });
    }
    if (xPixels.length > 1) {
      const pixel = xPixels[xPixels.length - 1];
      borderPixels.push({
        x: pixel.brickX,
        y: brickY,
        color: pixel.color,
      });
    }
  }

  // borderPixels.forEach(({ x, y }) => {
  //   brick.setPixelColor(testColor, x, y);
  // });

  // brick.write(path.resolve(__dirname, "../test/materials/brick.png"));

  const minBrickX = borderPixels.reduce((prev, curr) => {
    return prev.x < curr.x ? prev : curr;
  }).x;
  const maxBrickX = borderPixels.reduce((prev, curr) => {
    return prev.x > curr.x ? prev : curr;
  }).x;
  const minBrickY = borderPixels.reduce((prev, curr) => {
    return prev.y < curr.y ? prev : curr;
  }).y;
  const realBrickWidth = maxBrickX - minBrickX + 1;

  // all pixels of ground
  const ground = await Jimp.read(groundBuf);
  const groundWidth = ground.getWidth();
  const groundHeight = ground.getHeight();
  const groundPixels = {};
  for (let groundX = 0; groundX < groundWidth; groundX++) {
    groundPixels[groundX] = {};
    for (let groundY = 0; groundY < groundHeight; groundY++) {
      const color = ground.getPixelColor(groundX, groundY);
      groundPixels[groundX][groundY] = toRGB(color);
    }
  }

  // do comparison
  const compares = [];
  for (let groundX = 0; groundX < groundWidth - realBrickWidth; groundX++) {
    const diffs = [];
    borderPixels.forEach(({ x, y, color }) => {
      const gx = groundX + x - minBrickX;
      const centerColor = groundPixels[gx][y];
      let roundColors = [];
      if (gx > 0) {
        // left
        roundColors.push({
          gx: gx - 1,
          gy: y,
          color: groundPixels[gx - 1][y],
        });
      }
      if (y > 0) {
        // top
        roundColors.push({
          gx,
          gy: y - 1,
          color: groundPixels[gx][y - 1],
        });
      }
      // right
      if (gx < groundWidth - 1) {
        roundColors.push({
          gx: gx + 1,
          gy: y,
          color: groundPixels[gx + 1][y],
        });
      }
      // bottom
      if (y < groundHeight - 1) {
        roundColors.push({
          gx,
          gy: y + 1,
          color: groundPixels[gx][y + 1],
        });
      }
      // diff
      if (roundColors.length) {
        roundColors = roundColors.map(({ gx, gy, color }) => {
          const redDiff = color.r - centerColor.r;
          const greenDiff = color.g - centerColor.g;
          const blueDiff = color.b - centerColor.b;
          const diff = (redDiff + greenDiff + blueDiff) / 3;
          return {
            gx,
            gy,
            color,
            diff,
          };
        });
        const maxDiff = roundColors.reduce((prev, curr) => {
          return prev.diff > curr.diff ? prev : curr;
        });
        if (maxDiff) {
          diffs.push(maxDiff.diff);
          // ground.setPixelColor(testColor, maxDiff.gx, maxDiff.gy);
        }
      }
    });
    const total = diffs.reduce((prev, curr) => prev + curr, 0);
    const average = total / diffs.length;
    const confidence = average / 255;
    compares.push({
      groundX,
      confidence,
    });
  }

  // ground.write(path.resolve(__dirname, "../test/materials/ground.png"));

  // the best confidence
  let best;
  if (compares.length > 0) {
    best = compares.reduce((prev, curr) => {
      return prev.confidence > curr.confidence ? prev : curr;
    });
  }

  // done
  if (!best) {
    return {
      confidence: 0,
    };
  }
  return {
    confidence: round(best.confidence, 4),
    x: best.groundX,
    y: minBrickY,
  };
};

module.exports = crack;
