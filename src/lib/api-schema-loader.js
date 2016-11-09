// @flow

"use strict";

/**
 * This module exports a collection of helpers which converts a WebExtensions schema format into
 * flow types declarations.
 *
 * Plan:
 * - collect:
 *   - collect schema definitions from a json file
 *   - collect schema definitions from an array of schema directories
 *   - collect schema definitions from a base URL and an array of schema file names
 * - resolve:
 *   - resolve collected schemas into a map of definitions and their dependency graph
 * - convert:
 *   - convert WebExtension JSON schema to Flow Types declarations
 */

const fs = require("fs");
const path = require("path");
const stripComments = require("strip-json-comments");
const tsort = require("tsort");

const flowTypeGenerator = require("./flow-types-generator");

/*::

 export interface IWebExtSchemaType {
   type: "void" | "any" | "string" | "number" | "boolean" | "integer" |
     "array" | "object" | "function";
   choices?: Array<any>;
   items?: IWebExtSchemaType;
   properties?: {
     [name: string]: IWebExtSchemaType
   };
   name?: string;
   parameters?: Array<IWebExtSchemaType>;
   async?: string;
   unsupported?: boolean;
 };
 */

/*::

 type CollectedSchema = {|
   baseDir: string,
   fileName: string,
   jsonData: [Object]
 |};

 */
function collectSchemaFromFile(
  baseDir/*: string*/, fileName/*: string*/
)/*: CollectedSchema*/ {
  const raw = fs.readFileSync(path.join(baseDir, fileName));
  const jsonData = JSON.parse(stripComments(String(raw)));

  if (!Array.isArray(jsonData)) {
    throw new Error(`Invalid format: ${fileName} (${baseDir})`);
  }

  return {baseDir, fileName, jsonData};
}

function collectSchemaFromDir(baseDir/*: string */)/*: Array<CollectedSchema>*/ {
  const collectedSchemas = [];

  const files = fs.readdirSync(baseDir);

  for (var file of files) {
    if (/\.json$/.test(file)) {
      collectedSchemas.push(collectSchemaFromFile(baseDir, file));
    }
  }

  return collectedSchemas;
}

/*::

 type TSortGraph = {
   add(firstEdge: string, secondEdge?: string): void,
   sort(): Array<string>
 }

 type WebExtNamespace = {
   types: Array<IWebExtSchemaType>,
   functions: Array<IWebExtSchemaType>,
   events: Array<IWebExtSchemaType>
 };

 type DefinitionsMap = {
   [id: string]: IWebExtSchemaType
 }

 type SchemaCollectionManagerType = {
   namespaces: {
     [namespace: string]: WebExtNamespace
   },
   defsById: DefinitionsMap,
   depsGraph: TSortGraph
 };

 */

function SchemaCollectionManager() {
  this.namespaces = {};
  this.defsById = {};
  this.depsGraph = tsort();
}

SchemaCollectionManager.prototype = {
  addNamespaceData(nsData) {
    var ns;
    const namespace = nsData.namespace;
    if (!this.namespaces[namespace]) {
      ns = this.namespaces[namespace] = {
        namespace,
        events: nsData.events || [],
        functions: nsData.functions || [],
        types: nsData.types || [],
      };
    } else {
      ns = this.namespaces[namespace];
      if (nsData.events) {
        ns.events = ns.events.concat(nsData.events);
      }
      if (nsData.functions) {
        ns.functions = ns.functions.concat(nsData.functions);
      }
      if (nsData.types) {
        ns.types = ns.types.concat(nsData.types);
      }
    }
    this.defsById[namespace] = {type: "namespace", id: namespace};
  },

  processNamespaces() {
    for (var namespace of Object.keys(this.namespaces)) {
      this.processNamespaceTypes(namespace);
    }

    for (var namespace of Object.keys(this.namespaces)) {
      this.processNamespaceFunctions(namespace);
      this.processNamespaceEvents(namespace);
    }
  },

  processNamespaceEvents(namespace) {
    var ns = this.namespaces[namespace];

    for (var eventDef of ns.events) {
      // allowedContexts, deprecated, description,
      // extraParameters, name, parameters, returns,
      // type, unsupported
      var id = `${namespace}$${eventDef.name}`;
      eventDef.id = id;
      this.defsById[id] = {type: "event", namespace, id, eventDef};
      this.depsGraph.add(id, namespace);

      this.processParameters(eventDef);
      this.processReturns(eventDef);
      this.processParameters(eventDef, "extraParameters");
    }
  },

  processParameters(funcOrEventDef, property) {
    property = property || "parameters";
    const id = funcOrEventDef.id;
    for (var parameter of funcOrEventDef[property] || []) {
      // {type} | {"$ref"} | {choices}
      // {optional?}
      // type: any | array | boolean | function | integer | object | string
      if (parameter["$ref"]) {
        // Remove "manifest." from any of the referenced types.
        var ref = parameter["$ref"].split(".").pop();

        if (/\./.test(ref)) {
          throw new Error("Unexpected nested reference: " + ref);
        }

        // Add a dependency to the referenced type.
        this.depsGraph.add(ref, id);
      }
    }
  },

  processReturns(funcOrEventDef) {
    const id = funcOrEventDef.id;

    if (funcOrEventDef.returns) {
      var retRef = (funcOrEventDef.returns["$ref"] || "").split(".").pop();
      if (retRef) {
        if (/\./.test(retRef)) {
          throw new Error("Unexpected nested reference: " + retRef);
        }

        // Add a dependency to the referenced type.
        this.depsGraph.add(retRef, id);
      }
    }
  },

  processNamespaceFunctions(namespace) {
    var ns = this.namespaces[namespace];

    for (var funcDef of ns.functions) {
      var id = `${namespace}$${funcDef.name}`;
      funcDef.id = id;
      this.defsById[id] = {type: "function", namespace, id, funcDef};
      this.depsGraph.add(id, namespace);

      this.processParameters(funcDef);
      this.processReturns(funcDef);
    }
  },

  processNamespaceTypes(namespace) {
    var ns = this.namespaces[namespace];
    var extendsByTarget = new Map();
    var typesById = new Map();

    // Collect types defined by id and any "$extend" items.
    for (var type of ns.types) {
      if (type["$extend"]) {
        var items = extendsByTarget.get(type["$extend"]) || [];
        items.push(type);
        extendsByTarget.set(type["$extend"], items);
      } else {
        typesById.set(type.id, type);
      }
    }

    // Extend the collected types by applying the "$extend" items.
    for (var target of extendsByTarget.keys()) {
      var targetType = typesById.get(target);

      if (!targetType) {
        throw new Error(`Extended type not found: ${target}`);
      }

      var items = extendsByTarget.get(target);

      if (!Array.isArray(items)) {
        throw new Error(`Unable to find mixins for the extended type: ${target}`);
      }

      if (!targetType.choices) {
        // TODO(rpl): log or raise an error?
        continue;
      }

      for (var item of items) {
        if (item.choices) {
          targetType.choices = targetType.choices.concat(item.choices);
        }
      }

      typesById.set(target, targetType);
    }

    // Update the types by removing all the applied "$extend" items.
    ns.types = Array.from(typesById.values());
    for (var typeDef of typesById.values()) {
      this.defsById[typeDef.id] = {type: "type", id: typeDef.id, typeDef, namespace};
      // Add the type to the dependency graph (namespace depends from this definition)
      this.depsGraph.add(typeDef.id, namespace);
    }
  },

  declareTypeToFlow(def) {
    var params = {collectedDefinitions: this};
    var body = flowTypeGenerator.convertType(def.typeDef, params);
    return `declare type webext$${def.namespace}$${def.id} = ${body};\n\n`;
  },

  declareFunctionToFlow(def) {
    var params = {collectedDefinitions: this};

    // Turn function(param1?, param2, ...) into
    // two overloaded functions:
    // declare function name(param1, param2, ...)
    // declare function name(param2, ...)

    if (def.funcDef.parameters && def.funcDef.parameters.length >= 2 &&
        def.funcDef.parameters[0].optional && !def.funcDef.parameters[1].optional) {
      def.funcDef.parameters[0].optional = false;
      var body2 = flowTypeGenerator.convertType(def.funcDef, params);
      def.funcDef.parameters = def.funcDef.parameters.slice(1);
      var body = flowTypeGenerator.convertType(def.funcDef, params);

      return (
        `declare function webext$${def.id}${body};\n` +
        `declare function webext$${def.id}${body2};\n\n`
      );
    }

    var body = flowTypeGenerator.convertType(def.funcDef, params);
    return `declare function webext$${def.id}${body};\n\n`;
  },

  declareEventToFlow(def) {
    var fakeEventTypeDef = {
      type: "object",
      properties: {
        addListener: {
          name: "addListener",
          type: "function",
          parameters: [
            {
              name: "listener",
              type: "function",
              parameters: def.eventDef.parameters,
              returns: def.eventDef.returns
            }
          ]
        },
        removeListener: {
          name: "addListener",
          type: "function",
          parameters: [
            {
              name: "listener",
              type: "function"
            }
          ]
        }
      }
    };

    if (def.eventDef.extraParameters) {
      for (var param of def.eventDef.extraParameters) {
        param.optiona = true;
      }
      fakeEventTypeDef.properties.addListener.parameters =
        fakeEventTypeDef.properties.addListener.parameters.concat(def.eventDef.extraParameters);
      fakeEventTypeDef.properties.removeListener.parameters =
        fakeEventTypeDef.properties.removeListener.parameters.concat(def.eventDef.extraParameters);
    }

    return this.declareTypeToFlow(Object.assign(def, {
      id: def.eventDef.name,
      typeDef: fakeEventTypeDef
    }));
  },

  declareNamespaceToFlow(def) {
    var fakeNamespaceTypeDef = {
      type: "object",
      properties: {}
    };

    var nsDef = this.namespaces[def.id];

    for (var event of nsDef.events || []) {
      fakeNamespaceTypeDef.properties[event.name] = {
        "$ref": event.id,
      };
    }

    for (var func of nsDef.functions || []) {
      fakeNamespaceTypeDef.properties[func.name] = {
        "type": "typeof-$ref",
        "$ref": func.id,
      };
    }

    return this.declareTypeToFlow(Object.assign(def, {
      typeDef: fakeNamespaceTypeDef,
      namespace: def.id
    }));
  },

  convertToFlowTypes() {
    var sortedDefs = this.depsGraph.sort();
    var textFlow = "";

    for (var id of sortedDefs) {
      var def = this.defsById[id];

      switch (def.type) {
      case "type":
        textFlow += this.declareTypeToFlow(def);
        break;
      case "function":
        textFlow += this.declareFunctionToFlow(def);
        break;
      case "event":
        textFlow += this.declareEventToFlow(def);
        break;
      case "namespace":
        textFlow += this.declareNamespaceToFlow(def);
        break;
      }
    }

    var EXCLUDED_NAMESPACES = [
      "manifest", "events", "extensionTypes",
    ];

    var varBody = "";
    for (var nsName of Object.keys(this.namespaces)) {
      if (EXCLUDED_NAMESPACES.indexOf(nsName) >= 0) {
        continue;
      }

      varBody += `  ${nsName}: webext$${nsName}$${nsName},\n`;
    }

    textFlow += `declare var chrome: {\n${varBody}};\n\n`;
    textFlow += `declare var browser: {\n${varBody}};\n\n`;

    return textFlow;
  }
};

function resolveDefinitions(
  schemas/* : Array<CollectedSchema> */
)/* : SchemaCollectionManager */ {
  var defs = new SchemaCollectionManager();

  for (var data of schemas) {
    for (var nsData of data.jsonData) {
      defs.addNamespaceData(nsData);
    }
  }

  defs.processNamespaces();

  return defs;
}

function loadFromDirs(
  apiSchemaDirs/* : Array<string> */
)/* :  SchemaCollectionManager  */ {
  let nsDefs = [];

  for (let inputDir of apiSchemaDirs) {
    nsDefs = nsDefs.concat(collectSchemaFromDir(inputDir));
  }

  return resolveDefinitions(nsDefs);
}

module.exports = {
  loadFromDirs: loadFromDirs,
};
