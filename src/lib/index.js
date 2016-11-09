// @flow

"use strict";

const fs = require("fs");
const path = require("path");
const schemaLoader = require("./api-schema-loader.js");

const pkg = require("../../package.json");

const MOZ_VERSION_DISPLAY_RELPATH = "browser/config/version_display.txt";

const STANDARD_API_SCHEMA_DIRS = [
  "./toolkit/components/extensions/schemas/",
  "./browser/components/extensions/schemas/",
];

function generateFlowTypes(
  mozillaCentralDir/* : string */,
  apiSchemaDirs/* : Array<string> */,
  outputFilePath/* : string */
) {
  mozillaCentralDir = path.resolve(mozillaCentralDir);
  apiSchemaDirs = (apiSchemaDirs || [])
    .concat(STANDARD_API_SCHEMA_DIRS)
    .map(apiSchemaDir => path.resolve(mozillaCentralDir, apiSchemaDir));

  for (let apiSchemaDir of apiSchemaDirs) {
    if (apiSchemaDir.indexOf(mozillaCentralDir) !== 0) {
      throw new Error("Schema directory is not relative to mozilla-central: " +
                      apiSchemaDir);
    }
  }


  const mozillaCentralVersion = fs.readFileSync(
    path.resolve(mozillaCentralDir, MOZ_VERSION_DISPLAY_RELPATH)
  ).toString().trim();

  const flowTypes = schemaLoader.loadFromDirs(apiSchemaDirs).convertToFlowTypes();
  const now = new Date();
  const flowTypesPrologueComment = [
    `// WebExtensions Flow types for Firefox ${mozillaCentralVersion} WebExtensions JSON API schema`,
    `// generated on ${now.toString()}`,
    `// with [${pkg.name}](${pkg.homepage}) version ${pkg.version}`
  ].join("\n");

  if (!outputFilePath) {
    console.log(flowTypesPrologueComment);
    console.log(flowTypes);
  } else {
    fs.writeFileSync(outputFilePath, flowTypesPrologueComment + "\n\n" + flowTypes);
    console.log(`Flow types generated and saved to "${outputFilePath}".`);
  }
}

module.exports = {
  generateFlowTypes: generateFlowTypes,
};
