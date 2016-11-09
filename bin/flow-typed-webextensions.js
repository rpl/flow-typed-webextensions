"use strict";

const collectSchemaFromDir = require("../src/lib").collectSchemaFromDir;
const resolveDefinitions = require("../src/lib").resolveDefinitions;

const argv = require("yargs")
  .usage("Generate Flow types definitions from the loaded schema files.\n\nUsage: $0 <cmd> [options]")
  .options({
    help: {
      alias: "h",
      description: "Display the usage help",
    },
    "mozilla-central": {
      type: "string",
      alias: "m",
      description: "Local mozilla-central dir path",
      demand: true,
    },
    input: {
      alias: "i",
      description: "The directory to search for schema files",
    },
    output: {
      alias: "o",
      description: "The filename where the generated flow types definitions will be saved",
    },
  })
  .help("help")
  .alias("version", "v")
  .example(
    "$0", "-m /path/to/mozilla-central -o /path/to/save/webextensions.flow.js"
  )
  .argv;

if (Array.isArray(argv.output)) {
  console.error("ERROR: too many output option specified");
  process.exit(1);
}

if (Array.isArray(argv.mozillaCentral)) {
  console.error("ERROR: only one mozilla-central dir can be specified");
  process.exit(1);
}

const command = argv._[0];
const outputFile = argv.output;
let inputDirs = argv.input;
let mozillaCentral = argv.mozillaCentral;

if (inputDirs && !Array.isArray(inputDirs)) {
  inputDirs = [inputDirs];
}

if (mozillaCentral.length == 0) {
  console.error("ERROR: --mozilla-central option is mandatory");
  process.exit(1);
}

require('../src/lib').generateFlowTypes(mozillaCentral, inputDirs, outputFile);
