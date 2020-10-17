const manifest = require("./src/manifest.json");
const version = process.env.VERSION_TAG
  ? process.env.VERSION_TAG
  : `v${manifest.version}`;
console.log(version);
