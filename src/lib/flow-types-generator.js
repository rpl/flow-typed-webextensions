// @flow

"use strict";

const PRIMITIVE_TYPES = [
  "void", "any", "string", "number", "boolean", "integer"
];

const COMPOSED_TYPE = [
  "array", "object", "function"
];

/* ::

 import type {IWebExtSchemaType} from "./api-schema-loader";

 export interface IWebExtSchemaDefinitionsManager {
   defsById: {
     [defId: string]: IWebExtSchemaType
   };
 };


 export interface IConverterParams {
   forcedIndentLevel?: number;
   inFunction?: boolean;
   collectedDefinitions: IWebExtSchemaDefinitionsManager;
 };
 */

module.exports = {
  isPrimitiveType(typeDef/* : IWebExtSchemaType */) {
    return PRIMITIVE_TYPES.indexOf(typeDef.type) >= 0;
  },

  isReferenceType(typeDef/* : IWebExtSchemaType */) {
    // $FlowIssue: $ref is currently not defined in IWebExtSchemaType
    return !!typeDef["$ref"];
  },

  isComposedType(typeDef/* : IWebExtSchemaType */) {
    return COMPOSED_TYPE.indexOf(typeDef.type) >= 0 || typeDef.choices;
  },

  convertPrimitiveType(typeDef/* : IWebExtSchemaType */, params/* : IConverterParams */) {
    switch(typeDef.type) {
    case "void":
    case "any":
    case "string":
    case "number":
    case "boolean":
      return typeDef.type;
    case "integer":
      return "number";
    default:
      throw new Error(`Unknown primitive type ${typeDef.type}`);
    }
  },

  convertReferenceType(typeDef/* : IWebExtSchemaType */, params/* : IConverterParams */) {
    if (!params.collectedDefinitions) {
      throw new Error("Unable to resolve reference type without params.collectedDefinitions");
    }

    // $FlowIssue: $ref is currently not defined in IWebExtSchemaType
    const refId = typeDef["$ref"].split(".").pop();
    const refDef = params.collectedDefinitions.defsById[refId];

    if (!refDef) {
      throw new Error("Referenced type not found: " + refId);
    }

    var refType;
    if (refDef.id.startsWith(refDef.namespace)) {
      refType = `webext$${refDef.id}`;
    } else {
      refType = `webext$${refDef.namespace}$${refDef.id}`;
    }

    return refDef.type == "function" ? `typeof ${refType}` : refType;
  },

  convertComposedType(typeDef/* : IWebExtSchemaType */, params/* : IConverterParams */) {
    if (typeDef.choices) {
      return this.convertChoices(typeDef, params);
    }

    switch (typeDef.type) {
    case "array":
      return this.convertArray(typeDef, params);
    case "object":
      return this.convertObject(typeDef, params);
    case "function":
      return this.convertFunction(typeDef, params);
    default:
      throw new Error(`Unknown composed type ${JSON.stringify(typeDef)}`);
    }
  },

  convertChoices(typeDef/* : IWebExtSchemaType */, params/* : IConverterParams */) {
    if (PRIMITIVE_TYPES.indexOf(typeDef.type) >= 0) {
      return typeDef.type;
    }

    // TODO(rpl): evaluate alternatives.
    return "any";
  },

  convertArray(typeDef/* : IWebExtSchemaType */, params/* : IConverterParams */) {
    // typeDef items is a single `{type: "...}` which defines
    // the type of the array items.
    var body = this.convertType(typeDef.items, params);
    return `Array<${body}>`;
  },

  convertObject(typeDef/* : IWebExtSchemaType */, params/* : IConverterParams */) {
    // TODO(rpl): handle properties and additionalProperties?
    var forcedIndentLevel = params.forcedIndentLevel || 0;
    var body = Object.keys(typeDef.properties || {}).filter(name => {
      if (!typeDef.properties || !typeDef.properties[name]) {
        return false;
      }
      return !(typeDef.properties[name].unsupported);
    }).map(name => {
      if (!typeDef.properties || !typeDef.properties[name]) {
        throw new Error(`Unexpected missing property: ${name}`);
      }
      var prop = typeDef.properties[name];
      var isOptional = prop.optional ? "?" : "";

      var type = this.convertType(prop, Object.assign({}, params, {
        inFunction: true,
      }));

      var indent = forcedIndentLevel == 0 ? "" : (
        new Array(forcedIndentLevel)
      ).fill("  ").join("");

      return `${indent}${name}${isOptional}: ${type}`;
    }).join(forcedIndentLevel == 0 ? ", " : ",\n");

    var leftIndent = forcedIndentLevel == 0 ? "" : "\n";
    var rightIndent = forcedIndentLevel == 0 ? "" : "\n" + (
      new Array(forcedIndentLevel - 1)
    ).fill("  ").join("");

    if (typeDef.additionalProperties && typeDef.additionalProperties.type == "any") {
      return "any";
    }

    return body ? `{|${leftIndent}${body}${rightIndent}|}` : `{}`;
  },

  convertFunction(typeDef/* : IWebExtSchemaType */, params/* : IConverterParams */) {
    if (!typeDef.parameters && !typeDef.returns) {
      return "Function";
    }

    var asyncName = typeDef.async;
    var asyncParam/* : IWebExtSchemaType */;

    var nestedParams = Object.assign({}, params, {
      forcedIndentLevel: 0,
      inFunction: true,
    });

    var funcParams = (typeDef.parameters || []).map(funcParam => {
      var isOptional = funcParam.optional ? "?" : "";

      if (funcParam.type == "function" && funcParam.name == asyncName) {
        asyncParam = funcParam;
        isOptional = "?";
      }

      var paramType = this.convertType(funcParam, nestedParams);

      if (!funcParam.name) {
        throw new Error(`Unexpected missing param name in function schema definition: ${JSON.stringify(typeDef)}`);
      }


      return `${funcParam.name}${isOptional}: ${paramType}`;
    }).join(", ");

    var nestedParams = Object.assign({}, params, {
      inFunction: true,
    });
    var funcRet = this.convertType(typeDef.returns || {type: "void"}, nestedParams);
    if (typeDef.returns && typeDef.returns.optional && funcRet !== "any") {
      // Maybe type returned.
      funcRet = "?" + funcRet;
    }

    // Convert the callback function descriptor (asyncParam) into the Promise
    // type returned by an async function.
    if (asyncParam && !params.disabledAsync) {
      var asyncRet = "void";
      if (asyncParam.parameters && asyncParam.parameters.length > 0) {
        asyncRet = asyncParam.parameters.length == 1 ?
          this.convertType(asyncParam.parameters[0], nestedParams) :
          "[" +
          asyncParam.parameters.map(param => {
            return this.convertType(param, nestedParams);
          }).join(", ") +
          "]";
      }
      funcRet = `Promise<${asyncRet}>`;
    }

    if (params.inFunction) {
      return `(${funcParams}) => ${funcRet}`;
    }

    return `(${funcParams}): ${funcRet}`;
  },

  convertType(typeDef/* : IWebExtSchemaType */, params/* : IConverterParams */) {
    // check for primitive, reference and composed types
    if (this.isPrimitiveType(typeDef)) {
      return this.convertPrimitiveType(typeDef, params);
    }

    if (this.isReferenceType(typeDef)) {
      return this.convertReferenceType(typeDef, params);
    }

    if (this.isComposedType(typeDef)) {
      return this.convertComposedType(typeDef, Object.assign({}, params, {
        forcedIndentLevel: params.forcedIndentLevel + 1 || 1,
      }));
    }

    throw new Error("Unable to convert type: " + JSON.stringify(typeDef, null, 2));
  }
}
