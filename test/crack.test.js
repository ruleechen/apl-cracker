/*
 * test
 */

const fs = require("fs");
const path = require("path");
const crack = require("../src/crack");

const materials = [
  "sample1",
  "sample2",
  "sample3",
  "sample4",
  "sample5",
  "sample6",
];

materials.forEach((folder) => {
  const brick = `./materials/${folder}/data-brick.txt`;
  const ground = `./materials/${folder}/data-ground.txt`;
  const deserializeTo = path.resolve(__dirname, "materials", folder);
  const borderColor = "#FF0000";

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
    borderColor,
  }).then((left) => {
    console.log(left);
  });
});
