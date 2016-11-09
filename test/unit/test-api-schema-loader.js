"use strict";

import test from "ava";
import path from "path";
import apiSchemaLoader from "../../src/lib/api-schema-loader";

import {BASE_FIXTURES_DIR} from "../fixtures";

test("apiSchemaLoader.loadFromDirs", t => {
  var res = apiSchemaLoader.loadFromDirs([
    path.join(BASE_FIXTURES_DIR, "fake-mozilla-central", "schemadir-01"),
    path.join(BASE_FIXTURES_DIR, "fake-mozilla-central", "schemadir-02"),
  ]);

  // Test topological sorted definitions.
  t.deepEqual(
    res.depsGraph.sort(),
    [
      // FakeType does not depend from any other definition.
      "FakeType",
      // fakeCall and onFakeEvent (namespaced in fakeNamespace)
      // depends on FakeType.
      "fakeNamespace$fakeCall", "fakeNamespace$onFakeEvent",
      // fakeNamespace depends from all the above definitions.
      "fakeNamespace"
    ]
  );

  // Test map of schema definitions by id

  const BASE_PROPS = ["id", "type", "namespace"];

  t.deepEqual(
    Object.keys(res.defsById["FakeType"]).sort(),
    BASE_PROPS.concat("typeDef").sort()
  );

  t.deepEqual(
    Object.keys(res.defsById["fakeNamespace$fakeCall"]).sort(),
    BASE_PROPS.concat("funcDef").sort()
  );

  t.deepEqual(
    Object.keys(res.defsById["fakeNamespace$onFakeEvent"]).sort(),
    BASE_PROPS.concat("eventDef").sort()
  );

  t.deepEqual(
    Object.keys(res.defsById["fakeNamespace"]).sort(),
    ["id", "type"]
  );

  t.deepEqual(res.defsById["FakeType"], {
    id: "FakeType",
    type: "type",
    namespace: "fakeNamespace",
    // do not  typeDef content
    typeDef: res.defsById['FakeType'].typeDef,
  });
});
