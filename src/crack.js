/*
 * crack
 */

const path = require("path");
const Jimp = require("jimp");

const borderPosition = {
  top: "top",
  right: "right",
  bottom: "bottom",
  left: "left",
};

const borderColors = {
  top: Jimp.cssColorToHex("#FF0000"),
  right: Jimp.cssColorToHex("#00ff00"),
  bottom: Jimp.cssColorToHex("#0000ff"),
  left: Jimp.cssColorToHex("#00ffff"),
};

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

const crack = async ({
  groundDataString,
  brickDataString,
  deserializeTo,
  colorBorder,
}) => {
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
        position: borderPosition.top,
      });
    }
    if (yPixels.length > 1) {
      const pixel = yPixels[yPixels.length - 1];
      borderPixels.push({
        x: brickX,
        y: pixel.brickY,
        color: pixel.color,
        position: borderPosition.bottom,
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
        position: borderPosition.left,
      });
    }
    if (xPixels.length > 1) {
      const pixel = xPixels[xPixels.length - 1];
      borderPixels.push({
        x: pixel.brickX,
        y: brickY,
        color: pixel.color,
        position: borderPosition.right,
      });
    }
  }

  if (colorBorder) {
    borderPixels.forEach(({ x, y, position }) => {
      const color = borderColors[position];
      brick.setPixelColor(color, x, y);
    });
  }

  if (deserializeTo) {
    brick.write(path.resolve(deserializeTo, "temp_brick.png"));
  }

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
    let pairs = [];
    borderPixels.forEach(({ x, y, position }) => {
      const gx = groundX + x - minBrickX;
      const gc = groundPixels[gx][y];
      const origin = { gx, gy: y, color: gc };
      if (position === borderPosition.left) {
        if (gx > 0) {
          pairs.push({
            position,
            origin,
            compare: { gx: gx - 1, gy: y, color: groundPixels[gx - 1][y] },
          });
        }
      } else if (position === borderPosition.right) {
        if (gx < groundWidth - 1) {
          pairs.push({
            position,
            origin,
            compare: { gx: gx + 1, gy: y, color: groundPixels[gx + 1][y] },
          });
        }
      } else if (position === borderPosition.top) {
        if (y > 0) {
          pairs.push({
            position,
            origin,
            compare: { gx, gy: y - 1, color: groundPixels[gx][y - 1] },
          });
        }
      } else if (position === borderPosition.bottom) {
        if (y < groundHeight - 1) {
          pairs.push({
            position,
            origin,
            compare: { gx, gy: y + 1, color: groundPixels[gx][y + 1] },
          });
        }
      }
    });

    let total = 0;
    pairs.forEach(({ origin, compare }) => {
      const redDiff = Math.abs(origin.color.r - compare.color.r);
      const greenDiff = Math.abs(origin.color.g - compare.color.g);
      const blueDiff = Math.abs(origin.color.b - compare.color.b);
      total += (redDiff + greenDiff + blueDiff) / 3;
    });

    const average = total / pairs.length;
    const confidence = average / 255;
    compares.push({
      groundX,
      confidence,
      pairs,
    });
  }

  // the best confidence
  let best;
  if (compares.length > 0) {
    best = compares.reduce((prev, curr) => {
      return prev.confidence > curr.confidence ? prev : curr;
    });
  }

  if (best && colorBorder) {
    best.pairs.forEach(({ position, origin, compare }) => {
      const color = borderColors[position];
      ground.setPixelColor(color, origin.gx, origin.gy);
      ground.setPixelColor(color, compare.gx, compare.gy);
    });
  }

  if (deserializeTo) {
    ground.write(path.resolve(deserializeTo, "temp_ground.png"));
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
