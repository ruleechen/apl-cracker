/*
 * test
 */

const fs = require("fs");
const path = require("path");
const crack = require("../src/crack");

const materials = [
  {
    brick: "./materials/sample1/data-brick.txt",
    ground: "./materials/sample1/data-ground.txt",
  },
  {
    brick: "./materials/sample2/data-brick.txt",
    ground: "./materials/sample2/data-ground.txt",
  },
];

materials.forEach(({ brick, ground }) => {
  const groundDataString = fs.readFileSync(
    path.resolve(__dirname, ground),
    "utf8"
  );

  const brickDataString = fs.readFileSync(
    path.resolve(__dirname, brick),
    "utf8"
  );

  crack({
    groundDataString,
    brickDataString,
  }).then((left) => {
    console.log(left);
  });
});
