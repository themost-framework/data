---
index: 500
title: Create and configure a data model
summary: Learn how to define a model in JSON, configure its fields and key, and access it through a data context.
category: Data models
readingTime: 5 minutes
---

# Create and configure a data model

In `@themost/data`, a data model is described by a JSON definition. The definition gives the model a name and declares its fields, types, and other configuration. Keeping that description in a model file makes the structure available to the framework without defining it as a JavaScript class.

This guide introduces the model-file convention and the essentials for defining fields and keys. It uses the same JSON model configuration pattern as the repository's application examples.

## Where model definitions live

Place JSON definitions in the application's `config/models` directory. Use a file named for the model, such as `Product.json`, and make its top-level `name` match the model name used by the application. Repository examples follow this convention, including `Order.json` and `Person.json`.

The `$schema` property identifies the model schema used by editors and schema validators. The repository's model files use:

```json
"$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json"
```

A model definition is a JSON object. Its `name` identifies the model, `title` provides a display label, and `fields` is an array of field definitions. Other supported model-level properties include `version`, `inherits`, `constraints`, `views`, `privileges`, `eventListeners`, and `seed`; add these when the model needs them.

## Define fields and a key

Each field has a `name` and a `type`. The type can be a built-in data type such as `Counter`, `Text`, `Number`, or `DateTime`; a model name can also be used to describe a relationship to another model. Properties such as `title`, `description`, `nullable`, and `size` further describe a field. The schema also supports field options for defaults, calculations, validation, and association mappings.

Mark the key field with `"primary": true`. The models in this repository commonly use a `Counter` field for an identifier. To express a uniqueness rule across one or more fields, add a model-level constraint of type `unique` and list the field names.

Here is a small model definition:

```json
{
  "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
  "name": "Product",
  "title": "Products",
  "version": "1.0",
  "fields": [
    {
      "name": "id",
      "title": "ID",
      "type": "Counter",
      "primary": true
    },
    {
      "name": "name",
      "title": "Name",
      "type": "Text",
      "nullable": false,
      "size": 120
    },
    {
      "name": "price",
      "title": "Price",
      "type": "Number"
    }
  ],
  "constraints": [
    {
      "type": "unique",
      "fields": ["name"]
    }
  ]
}
```

Save this as `config/models/Product.json`. The `fields` array describes the model's data properties; `nullable: false` marks `name` as non-nullable, and `size` constrains the text field's configured size. The unique constraint applies to `name`. In a real model, choose a key and uniqueness rules that reflect the records your application needs to identify.

## Access the configured model

Once the model definition is available to the application's data configuration, retrieve it from a data context by its declared name:

```js
const products = context.model("Product");

const items = await products
  .where("name").equal("Notebook")
  .list();
```

`context.model("Product")` selects the model by its `name`; the query uses the declared `name` field. This example assumes `context` is an initialized data context configured for the application.

## Add related models deliberately

For a field that refers to another model, use that model's name as the field's `type`. Association mappings can specify how the relationship is represented when needed; their mapping options are covered in [Define associations between data models](define-model-associations.md). For a deeper reference to supported built-in types, see [Define field types](field-types-in-model-schemas.md).

## Summary

Define a model as JSON under `config/models`, keep its filename and `name` aligned, and describe its data with a `fields` array. Give each field an appropriate type, mark the primary key, and add constraints only for rules the model must enforce. Start with the smallest useful definition, then add model options or association mappings as the application requires them.
