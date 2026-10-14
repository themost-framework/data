---
title: Define multi-valued properties
summary: Learn how to define a property that holds multiple scalar values, how @themost/data maps those values, and how to read and update them.
category: Data models
readingTime: 5 minutes
---

# Define multi-valued properties

A model field normally describes one value. To associate a collection of scalar values—such as tags, skills, or keywords—with each record, declare the field with `"many": true`. The values are associated with the parent record through a junction model; they are not stored as a JSON array in the parent row.

This article covers scalar-valued collections. A field whose `type` is another model name describes an entity association instead, and may need an explicit association mapping.

## Define a scalar-valued collection

Add `many: true` to a field with a built-in data type:

```json
{
  "name": "skills",
  "title": "Skills",
  "description": "A collection of skills for this person.",
  "type": "Text",
  "many": true
}
```

The `many` property is a boolean in the model schema. For a primitive type such as `Text`, `@themost/data` infers a junction mapping. By default, the junction adapter name is the parent model name followed by the field name in upper camel case (`PersonSkills` for `Person.skills`). The generated junction model uses `object` for the parent key and `value` for each collection item. Its value field uses the declared field type, and the default generated definition adds a uniqueness constraint for the parent/value pair.

The junction is managed by `DataObjectTag`. Its first use migrates the junction model when needed. If an adapter model with the inferred name is already configured, make sure its fields and association match the property.

## Provide an explicit junction mapping

Use `mapping` when the association table or its field names need to match an existing database schema, or when you need association-level privileges:

```json
{
  "name": "tags",
  "title": "Tags",
  "type": "Text",
  "many": true,
  "mapping": {
    "associationAdapter": "UserTags",
    "associationObjectField": "user",
    "associationValueField": "tag",
    "privileges": [
      { "mask": 15, "type": "global" }
    ]
  }
}
```

This follows the `User.tags` model definition. The parent/value field names in the mapping identify the junction model's user and tag columns. The association adapter and its columns must be consistent with the database model; do not specify a custom adapter name unless that adapter is configured or can be created by the framework.

The default names `object` and `value` apply when `associationObjectField` and `associationValueField` are omitted. When you provide an explicit adapter that already exists, define its fields to match the mapping. You can also provide association privileges in `mapping`; the `User.tags` model uses this option.

## Read and change values

Load a parent record, then use its property accessor to work with its collection. For example, with the `User.tags` definition above:

```js
const user = await context.model("User")
  .where("name").equal("alexis.rees@example.com")
  .getTypedItem();

await user.property("tags").insert(["NewUser", "ValidUser"]);

const loadedUser = await context.model("User")
  .where("id").equal(user.id)
  .expand("tags")
  .getTypedItem();

console.log(loadedUser.tags); // ["NewUser", "ValidUser"]
```

The collection accessor supports `insert(values)`, `remove(values)`, and `removeAll()`. These methods accept a single value or an array where applicable. Use `expand("tags")` when retrieving a parent and you want the associated values included on the result.

## When to use `many`

Use a scalar `many` field when each parent has a set of values of the same type, for example `Text` tags. Use a regular `Json` field if the value is one JSON document whose structure belongs to the parent. Use a model-valued field and an association mapping when collection entries are records with their own fields and identity; in that case, map the relationship to the child model rather than treating those records as scalar values.

## Summary

Define a scalar multi-value property with a built-in `type` and `"many": true`. The framework represents its values through a junction association, inferring default adapter and column names or using the explicit `mapping` you provide. Read the values through `expand`, and manage them through the parent object's property accessor. Check adapter names, fields, and privileges against the application's actual database configuration before using a custom mapping.
