import { ObjectSchema } from "https://deno.land/x/lestruct@v0.0.2/src/utils.ts";
import { enums, object, optional } from "../npmDeps.ts";
import { ISchema, pureFns, schemaFns } from "./mod.ts";

export type Iterate = Record<string, number | any>;

export const selectStructFns = (schemasObj: ISchema) => {
  const fieldType = optional(enums([0, 1]));

  const decreaseIterate = (depth: Iterate) => {
    for (const key in depth) {
      // comments recursive becuase of decrease just first level and proccess every level on its fns
      // typeof depth[key] === "number" ? depth[key]-- : decreaseIterate(depth[key]);

      (typeof depth[key] === "number") && depth[key]--;
    }
    return depth;
  };

  type CheckRelation = (depth: Iterate, relation: string) => boolean;
  const checkRelation: CheckRelation = (depth, relation) =>
    depth && (typeof depth[relation] === "object" || depth[relation] > -1);

  const selectStruct = <T>(
    schema: string,
    depth: number | T = 2,
  ): any => {
    const pureSchema = pureFns(schemasObj).getPureModel(schema);
    let returnObj = {};
    for (const property in pureSchema) {
      // console.log(`${property}: ${object[property]}`);
      returnObj = {
        ...returnObj,
        [property]: fieldType,
      };
    }

    const iterateRelation = (
      schema: string,
      depth: number,
      pureObj: Record<string, unknown>,
    ) => {
      let returnObj = { ...pureObj };
      const foundedSchema = schemaFns(schemasObj).getSchema(schema);
      for (const property in foundedSchema.inrelation) {
        returnObj = {
          ...returnObj,
          [property]: selectStruct(
            foundedSchema.inrelation[property].schemaName,
            depth,
          ),
        };
      }
      for (const property in foundedSchema.outrelation) {
        returnObj = {
          ...returnObj,
          [property]: selectStruct(
            foundedSchema.outrelation[property].schemaName,
            depth,
          ),
        };
      }

      return optional(object(returnObj as ObjectSchema));
    };

    const numberDepth = (depth: number, pureObj: Record<string, any>) => {
      depth--;
      return depth > -1
        ? iterateRelation(schema, depth, pureObj)
        : optional(object(pureObj));
    };

    const objectDepth = (depth: any, pureObj: Record<string, any>) => {
      depth = decreaseIterate(depth);

      const foundedSchema = schemaFns(schemasObj).getSchema(schema);
      for (const property in foundedSchema.inrelation) {
        checkRelation(depth, property) &&
          (pureObj = {
            ...pureObj,
            [property]: selectStruct(
              foundedSchema.inrelation[property].schemaName,
              depth[property],
            ),
          });
      }
      for (const property in foundedSchema.outrelation) {
        checkRelation(depth, property) &&
          (pureObj = {
            ...pureObj,
            [property]: selectStruct(
              foundedSchema.outrelation[property].schemaName,
              depth[property],
            ),
          });
      }

      return optional(object(pureObj));
    };

    const completeObj = typeof depth === "number"
      ? numberDepth(depth, returnObj)
      : objectDepth(depth, returnObj);

    return completeObj;
  };
  return {
    fieldType,
    decreaseIterate,
    checkRelation,
    selectStruct,
  };
};
