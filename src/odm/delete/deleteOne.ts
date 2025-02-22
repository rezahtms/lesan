import { IMainRelation } from "../../mod.ts";
import { TSchemas } from "../../models/mod.ts";
import {
  Db,
  DeleteOptions,
  Document,
  Filter,
  ObjectId,
} from "../../npmDeps.ts";
import { throwError } from "../../utils/mod.ts";

interface IFindMainRelation extends IMainRelation {
  fieldName: string;
  collection: string;
}

const processFindMainRelatins = (
  { schemasObj, collection }: { schemasObj: TSchemas; collection: string },
) => {
  const findMainRelations: IFindMainRelation[] = [];
  for (const schema in schemasObj) {
    for (const mr in schemasObj[schema].mainRelations) {
      if (schemasObj[schema].mainRelations[mr].schemaName === collection) {
        findMainRelations.push({
          ...schemasObj[schema].mainRelations[mr],
          fieldName: mr,
          collection: schema,
        });
      }
    }
  }
  return findMainRelations;
};

const proccessDeletion = async (
  { db, schemasObj, collection, _id }: {
    db: Db;
    schemasObj: TSchemas;
    collection: string;
    _id: ObjectId;
  },
) => {
  for await (
    const mr of processFindMainRelatins({ schemasObj, collection })
  ) {
    const findedMr = await db.collection(mr.collection).find({
      [`${mr.fieldName}._id`]: _id,
    }, { projection: { _id: 1 } }).toArray();
    if (findedMr.length > 0) {
      const ids = findedMr.map((fmr) => fmr._id);
      await db.collection(mr.collection).deleteMany({
        _id: {
          $in: ids,
        },
      });
      for await (const fmr of findedMr) {
        await proccessDeletion({
          db,
          schemasObj,
          collection: mr.collection,
          _id: fmr._id,
        });
      }
    }
  }
};

export const deleteOne = async <PureFields extends Document = Document>({
  db,
  schemasObj,
  collection,
  filter,
  options,
  hardCascade,
}: {
  db: Db;
  schemasObj: TSchemas;
  collection: string;
  filter: Filter<PureFields>;
  options?: DeleteOptions;
  hardCascade?: boolean;
}) => {
  const foundedDoc = await db.collection(collection).findOne(
    filter as Filter<Document>,
  );
  const deleteProcces = async () => {
    const processFindMainRelatins = (
      { schemasObj, collection }: { schemasObj: TSchemas; collection: string },
    ) => {
      const findMainRelations: IFindMainRelation[] = [];
      for (const schema in schemasObj) {
        for (const mr in schemasObj[schema].mainRelations) {
          if (schemasObj[schema].mainRelations[mr].schemaName === collection) {
            findMainRelations.push({
              ...schemasObj[schema].mainRelations[mr],
              fieldName: mr,
              collection: schema,
            });
          }
        }
      }
      return findMainRelations;
    };

    const findDocsBasedOnMainRelation = [];

    for await (
      const mr of processFindMainRelatins({ schemasObj, collection })
    ) {
      const findedMr = await db.collection(mr.collection).findOne({
        [`${mr.schemaName}._id`]: foundedDoc!._id,
      });
      findedMr && findDocsBasedOnMainRelation.push({ ...mr, doc: findedMr });
    }

    const deletedData = async () => {
      if (findDocsBasedOnMainRelation.length > 0) {
        await proccessDeletion({
          db,
          schemasObj,
          collection,
          _id: foundedDoc!._id,
        });
      }
      await db.collection(collection).deleteOne(
        filter as Filter<Document>,
        options,
      );
      return true;
    };

    return hardCascade
      ? await deletedData()
      : findDocsBasedOnMainRelation.length === 0
      ? await deletedData()
      : throwError(
        `please clear below relations status before deletion: ${
          JSON.stringify(findDocsBasedOnMainRelation, null, 1).replace(
            /\r\n|\n|\r/gm,
            "",
          )
        }`,
      );
  };

  return foundedDoc
    ? await deleteProcces()
    : throwError("can not find this documents");
};
