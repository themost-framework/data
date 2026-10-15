---
index: 300
title: Define associations between data models
summary: Learn how model-valued fields, association mappings, and junction mappings describe relationships between data models.
category: Data models
readingTime: 6 minutes
---

# Define associations between data models

A model association is a field whose `type` names another data model. A field such as `customer` with `"type": "Person"` refers to a `Person` record; it is not the scalar `Model` type, which represents a model name as a value. Use a simple model-valued field for a direct reference, and add a `mapping` when the relationship needs explicit association details.

## Direct references

For example, an order can refer to its customer with a model-valued field:

```json
{
  "name": "customer",
  "title": "Customer",
  "type": "Person"
}
```

This is the pattern used by `Order.customer` in `spec/test2/config/models/Order.json`. The field points to a single `Person`; the schema allows the type to be another model's name.

## Define an inverse one-to-many association

To expose a collection of orders from a person, define a field on `Person` and map it to the child field on `Order`:

```json
{
  "name": "orders",
  "title": "Orders",
  "type": "Order",
  "expandable": true,
  "mapping": {
    "associationType": "association",
    "parentModel": "Person",
    "parentField": "id",
    "childModel": "Order",
    "childField": "customer"
  }
}
```

Here `parentModel` and `parentField` identify the parent side, while `childModel` and `childField` identify the related child side. In this example, `Order.customer` refers back to `Person`. The same mapping pattern is used by `Person.orders` in the repository's `Person.json`. The `expandable` field property marks the associated object(s) for automatic expansion.

The field schema also defines `many` for fields representing one-to-many or many-to-many associations. Use it to express that the field represents multiple related objects where appropriate; consult the target model's configuration for the specific mapping pattern.

## Define a many-to-many association

When the relationship is represented through a junction, use `associationType: "junction"` and specify the association adapter:

```json
{
  "name": "groups",
  "title": "Groups",
  "type": "Group",
  "mapping": {
    "associationType": "junction",
    "associationAdapter": "GroupMembers",
    "parentModel": "Group",
    "parentField": "id",
    "childModel": "User",
    "childField": "id",
    "cascade": "delete"
  }
}
```

The `User.groups` field in `spec/test2/config/models/User.json` uses this pattern. Match the adapter and model/field names to the association configuration in your application. `cascade` is optional; the model schema accepts `delete`, `none`, `null`, and `default`. Choose its behavior deliberately, particularly where deleting one related record could affect other records.

## Mapping options

The `mapping` object can also include:

| Property | Purpose |
| --- | --- |
| `options` | Association query options such as `$orderby`, `$select`, `$expand`, and `$levels`. |
| `privileges` | Permission rules for the association, using a `mask` and a privilege `type`, with optional account, filter, and scope. |
| `associationObjectField`, `associationValueField` | Identify the object and value fields for value associations such as the `User.tags` mapping in `User.json`. |

These properties are optional. Use the names and shapes defined in `model-schema.json`; for example, privilege types include `self`, `global`, `parent`, and `item`, and permission masks range from 0 to 31.

## Summary

Use another model's name as a field type to represent a related entity. Add an `association` mapping to describe parent/child fields explicitly, or a `junction` mapping for a relationship mediated by an association adapter. Keep both sides' model and field names aligned with the models configured in your application, and use expansion, cascade, and privilege options only when the relationship requires them.
