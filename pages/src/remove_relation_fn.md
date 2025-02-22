# `removeRelation` function
## Update Many to Many Relation
Pay attention to the following code:
```ts
const removeLivedCitiesValidator = () => {
  return object({
    set: object({
      _id: objectIdValidation,
      livedCities: array(objectIdValidation),
    }),
    get: coreApp.schemas.selectStruct("user", 1),
  });
};
const removeLivedCities: ActFn = async (body) => {
  const { livedCities, _id } = body.details.set;

  const obIdLivedCities = livedCities.map(
    (lc: string) => new ObjectId(lc),
  );

  return await users.removeRelation({
    filters: { _id: new ObjectId(_id) },
    projection: body.details.get,
    relations: {
      livedCities: {
        _ids: obIdLivedCities,
        relatedRelations: {
          users: true,
        },
      },
    },
  });
};
coreApp.acts.setAct({
  schema: "user",
  actName: "removeLivedCities",
  validator: removeLivedCitiesValidator(),
  fn: removeLivedCities,
});
```
In the code above, the `removeRelation` function is used. This function receives an object input with the following keys:
- A `filter` key that receives [MongoDB findOne filter](https://www.mongodb.com/docs/manual/reference/method/db.collection.findOne/) and finds only one document to change its relationships.
- The `relations` key receives an object from the relations of this model. We talk about the relation input [here](https://miaadteam.github.io/lesan/add_relation.html#add-new-act-with-relation)
- The `projection` key is used to receive written data. Also we talk about `projection` key [here](https://miaadteam.github.io/lesan/getting_start.html#the-fn-function)

In the function above, we remove one or more cities to the set of cities where a user has lived. In fact, in the validation function, the user ID is received along with an array of city IDs, and in the Act function, we convert the array of city IDs into an array of object IDs and give it to the `removeRelation` function along with the user ID. As a result, on the `user` side, one or more cities are removed from the `livedCities` array, and on the `city` side, this user is removed from each of the cities whose IDs have been sent. (To know the steps to do this and understand how the `relatedRelations` are managed, [please read this section](./add_relation_fn.md#steps-to-add-a-country-to-a-user), just note that we do not have a document to add here, and we only do the steps to remove and place the next document in the limited lists.)  

### Run the code
Since all the code is getting bigger and bigger, we put it on [GitHub](https://github.com/MiaadTeam/lesan/tree/main/examples/document), you can see and download it [here](https://raw.githubusercontent.com/MiaadTeam/lesan/main/examples/document/06-remove-relation-fn-1.ts).  
By running the codes and going to the playground, you can see and test the functions added to the user.
![add-relation](https://github.com/MiaadTeam/lesan/assets/6236123/1ce92eb4-0d0a-4823-acfc-33965e0d29f5)

TODO add picture of document

## Update One to Many Relation
If you have created a `single` type relationship, and if you set the `optional` equivalent to `false`, we can not use `removeRelation` for that please use the [`addRelation`](./add_relation_fn.md) function to replace it (for example we can not use `removeRelation` to remove `country` from a user).  
But if you set the `optional` equal to `true`, we can use the `removeRelation` function to erase that relationship along with its relatedrelations.  
Let's make an `optional` one-to-many relationship. We create a new relationship for the user:
```ts
  mostLovedCity: {
    optional: true,
    schemaName: "city",
    type: "single",
    relatedRelations: {
      lovedByUser: {
        type: "multiple",
        limit: 3,
        sort: {
          field: "_id",
          order: "desc",
        },
      },
    },
  },
```
So the full form of `users` will be:
```ts
const users = coreApp.odm.newModel("user", userPure, {
  livedCities: {
    optional: false,
    schemaName: "city",
    type: "multiple",
    sort: {
      field: "_id",
      order: "desc",
    },
    relatedRelations: {
      users: {
        type: "multiple",
        limit: 5,
        sort: {
          field: "_id",
          order: "desc",
        },
      },
    },
  },

  mostLovedCity: {
    optional: true,
    schemaName: "city",
    type: "single",
    relatedRelations: {
      lovedByUser: {
        type: "multiple",
        limit: 5,
        sort: {
          field: "_id",
          order: "desc",
        },
      },
    },
  },

  country: {
    optional: false,
    schemaName: "country",
    type: "single",
    relatedRelations: {
      users: {
        type: "multiple",
        limit: 5,
        sort: {
          field: "_id",
          order: "desc",
        },
      },
    },
  },
});
```
In this relationship, we add a city as a `mostLovedCity` for a user, and on the side of the city we add a field called `lovedByUser`, where we store the last five users who have chosen it as their `mostLovedCity`.  
To erase the `mostLovedCity` relationship in a user. We must first create this relationship.  
So let's write a function to add this relationship:
```ts
const addMostLovedCityValidator = () => {
  return object({
    set: object({
      _id: objectIdValidation,
      lovedCity: objectIdValidation,
    }),
    get: coreApp.schemas.selectStruct("user", 1),
  });
};
const addMostLovedCity: ActFn = async (body) => {
  const { lovedCity, _id } = body.details.set;

  return await users.addRelation({
    filters: { _id: new ObjectId(_id) },
    projection: body.details.get,
    relations: {
      mostLovedCity: {
        _ids: new ObjectId(lovedCity),
        relatedRelations: {
          lovedByUser: true,
        },
      },
    },
    replace: true,
  });
};
coreApp.acts.setAct({
  schema: "user",
  actName: "addMostLovedCity",
  validator: addMostLovedCityValidator(),
  fn: addMostLovedCity,
});
```
In the above function, we get the ID of a user and the ID of a city and store that city as `mostLovedCity` in the user. Also, on the city side, we add this user to the `lovedByUser` list.  

TODO add playground photo and photoshop of user and city from Mogodb Compass  

Well, finally, let's write the `mostLovedCity` remove function:
```ts
const removeMostLovedCityValidator = () => {
  return object({
    set: object({
      _id: objectIdValidation,
      lovedCity: objectIdValidation,
    }),
    get: coreApp.schemas.selectStruct("user", 1),
  });
};
const removeMostLovedCity: ActFn = async (body) => {
  const { lovedCity, _id } = body.details.set;

  return await users.removeRelation({
    filters: { _id: new ObjectId(_id) },
    projection: body.details.get,
    relations: {
      mostLovedCity: {
        _ids: new ObjectId(lovedCity),
        relatedRelations: {
          lovedByUser: true,
        },
      },
    },
  });
};
coreApp.acts.setAct({
  schema: "user",
  actName: "removeMostLovedCity",
  validator: removeMostLovedCityValidator(),
  fn: removeMostLovedCity,
});
```
In the above function, we get the ID of a user along with the ID of a city, and in that user, we delete the `mostLovedCity` field if it matches this ID, and on the city side, we remove this user from the `lovedByUser` list. (To know the steps to do this and understand how the `relatedRelations` are managed, [please read this section](./add_relation_fn.md#steps-to-add-a-country-to-a-user), just note that we do not have a document to add here, and we only do the steps to remove and place the next document in the limited lists.)

### Run the code
Since all the code is getting bigger and bigger, we put it on [GitHub](https://github.com/MiaadTeam/lesan/tree/main/examples/document), you can see and download it [here](https://raw.githubusercontent.com/MiaadTeam/lesan/main/examples/document/06-remove-relation-fn-2.ts).  
By running the codes and going to the playground, you can see and test the functions added to the user.
![add-relation](https://github.com/MiaadTeam/lesan/assets/6236123/1ce92eb4-0d0a-4823-acfc-33965e0d29f5)

TODO add playground photo and photoshop of user and city from Mogodb Compass  

  




