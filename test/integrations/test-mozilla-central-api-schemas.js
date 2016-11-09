"use strict";

import test from "ava";
import fs from "fs";
import path from "path";

import {
  BASE_FIXTURES_DIR,
  getExpectedFlowTypesFragments,
} from "../fixtures";

import apiSchemaLoader from "../../src/lib/api-schema-loader";

test("apiSchemaLoader.loadFromDirs and convertToFlowTypes - load real mozilla-central schema files", async (t) => {
  var res = apiSchemaLoader.loadFromDirs([
    path.join(BASE_FIXTURES_DIR, "mozilla-central", "toolkit", "components", "extensions", "schemas"),
    path.join(BASE_FIXTURES_DIR, "mozilla-central", "browser", "components", "extensions", "schemas"),
  ]);

  t.pass("apiSchemaLoader has successfully read schemas from mozilla-central");

  t.deepEqual(
    Object.keys(res.namespaces).sort(),
    [
      "alarms","bookmarks","browserAction","commands","contextMenus","contextMenusInternal",
      "cookies","downloads","events","extension","extensionTypes","history","i18n","idle",
      "management","manifest","notifications","pageAction","runtime","sessions","storage",
      "tabs","test","topSites","webNavigation","webRequest","windows"
    ],
    "All the expected schemas have been loaded"
  );

  t.deepEqual(
    Object.keys(res.namespaces.runtime).sort(),
    ["events","functions","namespace","types"],
    "A loaded namespace (runtime) contains the expected property"
  );

  t.deepEqual(
    res.defsById["runtime$sendMessage"],
    {
      type:"function",
      namespace:"runtime",
      id:"runtime$sendMessage",
      funcDef: {
        ...(res.defsById["runtime$sendMessage"].funcDef),
        name:"sendMessage",
        type:"function",
      }
    }
  );

  const actualFlowTypesDefinitions = res.convertToFlowTypes();

  // Test the final aggregated namespace
  const expectedBrowserNamespace =
          await getExpectedFlowTypesFragments("browser-namespace.flow.js");
  t.true(actualFlowTypesDefinitions.indexOf(expectedBrowserNamespace) > 0);

  // Test simple overloaded API method
  const expectedAlarmsGetMethod =
          await getExpectedFlowTypesFragments("alarms-get.flow.js");
  t.true(actualFlowTypesDefinitions.indexOf(expectedAlarmsGetMethod) > 0);

  // Test simple aggregated API namespace
  const expectedAlarmsNamespace =
          await getExpectedFlowTypesFragments("alarms-namespace.flow.js");
  t.true(actualFlowTypesDefinitions.indexOf(expectedAlarmsNamespace) > 0);

  // Test topological ordered: API method -> API namespace -> browser namespace
  t.true(
    0 <
    actualFlowTypesDefinitions.indexOf(expectedAlarmsGetMethod) <
      actualFlowTypesDefinitions.indexOf(expectedAlarmsNamespace) <
      actualFlowTypesDefinitions.indexOf(expectedBrowserNamespace)
  );
});
