"use strict";

const fs = require("fs");
const path = require("path");

module.exports.BASE_FIXTURES_DIR = __dirname;

module.exports.getExpectedFlowTypesFragments = function (fragmentFileName) {
  return new Promise(function (resolve, reject) {
    fs.readFile(
      path.join(__dirname, "generated-flowtypes-fragments", fragmentFileName),
      function (err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
  });
};
