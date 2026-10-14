---
title: Define model fields
summary: Learn how to declare model fields with primitive types and configure associations between data models.
category: Data models
readingTime: 8 minutes
---

# Define model fields

A field definition describes a property of a data model. At a minimum, define its `name` and `type`; additional properties can specify constraints, display information, and association behavior.

## Define a field

The following example defines a required text field for a product category:

```json
{
  "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
  "@id": "http://schema.org/Product",
  "name": "Product",
  "fields": [
    {
      "@id": "http://schema.org/category",
      "name": "category",
      "type": "Text",
      "nullable": false,
      "editable": true,
      "readonly": false,
      "size": 100,
      "title": "Category",
      "description": "The category of the product."
    }
  ]
}
```

The field's `name` identifies it, and `type` specifies the kind of value it stores. In this example, `nullable` disallows null values, `size` sets the maximum text length, and `title` and `description` provide display and explanatory text. The `editable` and `readonly` properties control whether the field can be modified.

## Use primitive types

Primitive types describe basic values. Common examples include:

| Type | Description |
| --- | --- |
| `Text` | A string of characters. |
| `Number` | A numeric value. |
| `Boolean` | A true or false value. |
| `Date` | A date. |
| `DateTime` | A date and time. |
| `Integer` | An integer value. |
| `Float` | A floating-point value. |
| `Decimal` | A decimal value. |

Use these types in a model's `fields` array:

```json
{
  "fields": [
    {
      "name": "age",
      "type": "Integer",
      "nullable": false
    },
    {
      "name": "isActive",
      "type": "Boolean",
      "nullable": false
    },
    {
      "name": "createdAt",
      "type": "DateTime",
      "nullable": false
    }
  ]
}
```

Here, `age` stores an integer, `isActive` stores a Boolean, and `createdAt` stores a date and time. For more information, see [Use primitive types](010-use-primitive-types.md).

## Define relationships

Use another model's name as a field's `type` to define an association. The association mapping describes how related records are connected. The following examples show common one-to-many, many-to-many, and one-to-one patterns.

### One-to-many relationships

A model-valued field such as `createdBy` on `Product` refers to a `User`. This is a many-to-one reference from `Product` to `User`; viewed from `User`, it is a one-to-many relationship.

```json
{
  "name": "createdBy",
  "type": "User",
  "nullable": false
}
```

The framework can infer an association mapping for this field. A fully specified mapping looks like this:

```json
{
  "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
  "@id": "http://schema.org/Product",
  "name": "Product",
  "fields": [
    {
      "name": "createdBy",
      "type": "User",
      "mapping": {
        "associationType": "association",
        "parentModel": "User",
        "parentField": "id",
        "childModel": "Product",
        "childField": "createdBy",
        "cascade": "none"
      }
    }
  ]
}
```

Here, `Product.createdBy` stores the foreign key that references `User.id`. The `cascade` property controls what happens to related records when an operation is performed. Its default is `none`, which does not cascade operations and can result in a constraint error if the operation would violate a relationship. Supported values are:

| Value | Behavior when a related record is deleted |
| --- | --- |
| `none` | Do not cascade; a constraint violation may prevent the operation. |
| `delete` | Delete related records. |
| `null` | Set the foreign key value to `null`. |
| `default` | Set the foreign key value to its default. |

You can also define the collection of related records on the parent model. For example, `Product.orders` refers to the `Order` records whose `orderedItem` field references `Product.id`:

```json
{
  "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
  "@id": "http://schema.org/Product",
  "name": "Product",
  "fields": [
    {
      "name": "orders",
      "type": "Order",
      "expandable": false,
      "many": true,
      "mapping": {
        "parentModel": "Product",
        "parentField": "id",
        "childModel": "Order",
        "childField": "orderedItem",
        "associationType": "association",
        "cascade": "none"
      }
    }
  ]
}
```

### Many-to-many relationships

A many-to-many field refers to multiple records in another model. For example, a `User` can have multiple `Group` records in its `groups` field:

```json
{
  "name": "groups",
  "type": "Group"
}
```

The framework uses a junction association to connect the models. A mapping can specify the junction model and its fields:

```json
{
  "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
  "@id": "http://schema.org/User",
  "name": "User",
  "fields": [
    {
      "name": "groups",
      "type": "Group",
      "mapping": {
        "associationType": "junction",
        "parentModel": "Group",
        "parentField": "id",
        "childModel": "User",
        "childField": "id",
        "associationAdapter": "GroupMembers",
        "associatedObjectField": "group",
        "associatedValueField": "user",
        "cascade": "none"
      }
    }
  ]
}
```

In this example, `GroupMembers` is the junction table between `User` and `Group`. The `associatedObjectField` and `associatedValueField` properties name the junction fields that reference `Group` and `User`, respectively. The framework uses the association's parent model and field when supporting cascade operations.

The association can also be declared on `Group` as a collection of users:

```json
{
  "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
  "@id": "http://schema.org/Group",
  "name": "Group",
  "fields": [
    {
      "name": "members",
      "type": "User",
      "mapping": {
        "associationType": "junction",
        "parentModel": "Group",
        "parentField": "id",
        "childModel": "User",
        "childField": "id",
        "associationAdapter": "GroupMembers",
        "associatedObjectField": "group",
        "associatedValueField": "user",
        "cascade": "none"
      }
    }
  ]
}
```

### One-to-one relationships

A one-to-one association can use a foreign key on the related model. In this example, `Product.productDimensions` refers to a nested `ProductDimension` record:

```json
{
  "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
  "@id": "http://schema.org/Product",
  "name": "Product",
  "fields": [
    {
      "name": "productDimensions",
      "type": "ProductDimension",
      "nested": true,
      "expandable": true,
      "multiplicity": "ZeroOrOne",
      "mapping": {
        "parentModel": "Product",
        "parentField": "id",
        "childModel": "ProductDimension",
        "childField": "product",
        "associationType": "association",
        "cascade": "delete"
      }
    }
  ]
}
```

`nested` indicates that the related record is created, updated, or deleted together with the current record. `expandable` indicates that the relationship can be expanded in queries, and `multiplicity` sets the relationship to zero or one related record.

The related model defines the foreign key field. A unique constraint on `product` ensures that a product is associated with at most one `ProductDimension`:

```json
{
  "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
  "name": "ProductDimension",
  "version": "2.0.0",
  "fields": [
    {
      "name": "width",
      "type": "Number",
      "nullable": false
    },
    {
      "name": "height",
      "type": "Number",
      "nullable": false
    },
    {
      "name": "product",
      "type": "Product"
    }
  ],
  "constraints": [
    {
      "type": "unique",
      "fields": ["product"]
    }
  ]
}
```

A junction mapping can also represent a zero-or-one association when you do not want to add a foreign key field to the current model. For example, the following `Product.madeIn` field maps to `Country` through a junction:

```json
{
  "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
  "@id": "http://schema.org/Product",
  "name": "Product",
  "fields": [
    {
      "name": "madeIn",
      "type": "Country",
      "nullable": true,
      "many": true,
      "multiplicity": "ZeroOrOne",
      "mapping": {
        "associationType": "junction",
        "associationObjectField": "product",
        "associationValueField": "country",
        "parentModel": "Product",
        "parentField": "id",
        "childModel": "Country",
        "childField": "id"
      }
    }
  ]
}
```

The `associationObjectField` and `associationValueField` properties specify the junction fields that reference `Product` and `Country`. The `multiplicity` property limits the relationship to zero or one. If you prefer to store the relationship directly on `Product`, define `madeIn` as a regular model-valued field instead:

```json
{
  "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
  "@id": "http://schema.org/Product",
  "name": "Product",
  "version": "2.1.0",
  "fields": [
    {
      "name": "madeIn",
      "type": "Country",
      "nullable": true
    }
  ]
}
```

## Summary

Define each field with a name and type, then add properties for constraints, display, or behavior as needed. Use a model name as the type of an association and configure its mapping to represent one-to-many, many-to-many, or one-to-one relationships. Use primitive types for scalar values and refer to the [primitive types guide](010-use-primitive-types.md) for details.
