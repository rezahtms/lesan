# `addRelation` function
## Update Many to Many Relation
Pay attention to the following code:
```ts
const addUserLivedCityValidator = () => {
  return object({
    set: object({
      _id: objectIdValidation,
      livedCities: array(objectIdValidation),
    }),
    get: coreApp.schemas.selectStruct("user", 1),
  });
};
const addUserLivedCity: ActFn = async (body) => {
  const { livedCities, _id } = body.details.set;
  const obIdLivedCities = livedCities.map(
    (lc: string) => new ObjectId(lc),
  );

  return await users.addRelation({
    _id: new ObjectId(_id),
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
  actName: "addUserLivedCities",
  validator: addUserLivedCityValidator(),
  fn: addUserLivedCity,
});
```
In addition to the functions `insert`, `update`, `delete`, `find`, etc., for each model in the `Lesan`, there are two other functions in addition to `MongoDB` functions, named `addRelation` and `removeRelation`, which are prepared for managing relationships. In the code above, the `addRelation` function is used. This function receives an object input with the following keys:
- A `filter` key that receives [MongoDB findOne filter](https://www.mongodb.com/docs/manual/reference/method/db.collection.findOne/) and finds only one document to change its relationships.
- The `relations` key receives an object from the relations of this model. We talk about the relation input [here](https://miaadteam.github.io/lesan/add_relation.html#add-new-act-with-relation)
- The `projection` key is used to receive written data. Also we talk about `projection` key [here](https://miaadteam.github.io/lesan/getting_start.html#the-fn-function)
- And another key called `replace`, which is not used here, and receives a boolean value of `false` or `true`. We will talk about this key in the next step.

In the function above, we add one or more cities to the set of cities where a user has lived. In fact, in the validation function, the user ID is received along with an array of city IDs, and in the Act function, we convert the array of city IDs into an array of object IDs and give it to the `addRelation` function along with the user ID. As a result, on the `user` side, one or more cities are added to the `livedCities` array, and on the `city` side, this user is added to each of the cities whose IDs have been sent.  

### Run the code
Since all the code is getting bigger and bigger, we put it on [GitHub](https://github.com/MiaadTeam/lesan/tree/main/examples/document), you can see and download it [here](https://raw.githubusercontent.com/MiaadTeam/lesan/main/examples/document/05-add-relation-fn-1.ts).  
By running the codes and going to the playground, you can see and test the functions added to the user.
![add-relation](https://github.com/MiaadTeam/lesan/assets/6236123/1ce92eb4-0d0a-4823-acfc-33965e0d29f5)

TODO add picture of document

## Update One to Many Relation
What if in one of these sides our field is an object instead of an array (In fact, the type of relationship is one-to-many or many-to-one.)? For example, let's change the country on the user side.  
Look at code below:
```ts
const addUserCountryValidator = () => {
  return object({
    set: object({
      _id: objectIdValidation,
      country: objectIdValidation,
    }),
    get: coreApp.schemas.selectStruct("user", 1),
  });
};
const addUserCountry: ActFn = async (body) => {
  const { country, _id } = body.details.set;

  return await users.addRelation({
    _id: new ObjectId(_id),
    projection: body.details.get,
    relations: {
      country: {
        _ids: new ObjectId(country),
        relatedRelations: {
          users: true,
        },
      },
    },
    replace: true,
  });
};
coreApp.acts.setAct({
  schema: "user",
  actName: "addUserCountry",
  validator: addUserCountryValidator(),
  fn: addUserCountry,
});
```
In the code above, we get the ID of a user along with the ID of a country and give it to the `addRelation` function. Please note that the country is not `optional` in the user model and is defined with a `single` type. Therefore, if we change the country of a user, we must first find and delete this user in the country he was in before, then add the new country to the user and the user to the new country. For this reason, we have given the value `true` to the `replace` key in the `addRelation` entry. In this function, if we set `replace` equal to `false` or do not enter it, no operation will be performed and we will get an error.  

### Steps to add a country to a user
> The bottom line is a bit complicated but has its own charm.

To change the country in a user, we must do the following steps:
- Find the user
- Finding the user's old country
- Find the user's new country
- Checking whether this user was part of the list of users in the old country or not (users may exist in several fields in one country, for example, the list of users who are the oldest or the youngest).
- Creating a `command` to delete the user from the old country (from all the lists in which the user was found).
- If this list has a certain limit and we have reached the end of this limit, we need to find the next user to be added to this list. For this purpose, we must do the following steps:
  - Find out how to save this list.
  - Finding the next 3 users who can be added to this list (because it is possible to find either the same user that we intend to delete from the list, or the end user of this list).
  - Creating an `command` to add these 3 users to the end of this list.
  - Creating a `command` to unify this list.
  - Creating a `command` to delete the current user from this list.
  - Creating a sorting `command` for this list according to the method we mentioned in the initial settings of relationships.
  - Creating an `command` to limit this list to the number that we said in the initial settings of relationships.
- Creating an `command` to add this user to all user lists in the new country. (Here we also have to check if this list has limit or not and if so, this user can be added to this list or not, which we have to do step #6 for each list in the new country).
- Execution of all the `commands` we have created so far.
- Execution of the `command` to insert the new country instead of the old country in this user.

### Run the code
Since all the code is getting bigger and bigger, we put it on [GitHub](https://github.com/MiaadTeam/lesan/tree/main/examples/document), you can see and download it [here](https://raw.githubusercontent.com/MiaadTeam/lesan/main/examples/document/05-add-relation-fn-2.ts).  
By running the codes and going to the playground, you can see and test the functions added to the user.
![add-relation](https://github.com/MiaadTeam/lesan/assets/6236123/1ce92eb4-0d0a-4823-acfc-33965e0d29f5)


TODO add picture of document



