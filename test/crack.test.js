/*
 * test
 */

const fs = require("fs");
const path = require("path");
const crack = require("../src/crack");

const materials = [
  // "sample1",
  // "sample2",
  // "sample3",
  // "sample4",
  // "sample5",
  // "sample6",
  // "20221125-1",
  // "20221125-2",
  // "20221125-3",
  // "20221125-4",
  "20230718-1"
];

materials.forEach((folder) => {
  const brick = `./materials/${folder}/data-brick.txt`;
  const ground = `./materials/${folder}/data-ground.txt`;
  const deserializeTo = path.resolve(__dirname, "materials", folder);
  const colorBorder = true;

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
    deserializeTo,
    colorBorder,
  }).then((left) => {
    console.log(left);
  });
});
