---
title: Define a model constraint
summary: Add a unique constraint to a model and use one or more fields to define which values must be unique.
category: Data models
readingTime: 4 minutes
---

# Define a model constraint

A model constraint describes a rule that applies across records in a data model. In `@themost/data`, model definitions support a `unique` constraint, which is useful when a field—or a combination of fields—must identify distinct records.

## Add a unique constraint

Put constraints in the model-level `constraints` array, alongside `fields`. Each constraint uses `type: "unique"` and a `fields` array containing names declared by the model:

```json
{
  "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
  "name": "Product",
  "title": "Products",
  "fields": [
    { "name": "id", "type": "Counter", "primary": true },
    { "name": "sku", "type": "Text", "nullable": false }
  ],
  "constraints": [
    {
      "type": "unique",
      "fields": ["sku"]
    }
  ]
}
```

This declares that `sku` must be unique across product records. Keep the constraint at the model level; it is not a property of an individual field.

## Use a composite constraint

List multiple field names when uniqueness applies to their combination. For example, a migration record can be unique for each `appliesTo` and `version` pair:

```json
{
  "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
  "name": "Migration",
  "fields": [
    { "name": "appliesTo", "type": "Text" },
    { "name": "version", "type": "Text" }
  ],
  "constraints": [
    {
      "type": "unique",
      "fields": ["appliesTo", "version"]
    }
  ]
}
```

This does not require `appliesTo` or `version` to be unique separately; it describes the pair. Use field names exactly as they appear in the model's `fields` array.

## Schema details

The model schema accepts `unique` as the constraint type and allows an optional `description`. A constraint item must include `type`; `fields` is an array of strings. The schema does not mark `fields` as required, but include at least one valid field name to define a useful uniqueness rule. No other constraint types are listed in the schema.

## Summary

Define a uniqueness rule in the model's top-level `constraints` array with `type: "unique"`. Use one field for a single-value rule or multiple fields for a composite rule, and verify that every listed name matches a model field. Keep in mind that `unique` is the constraint type currently declared by the model schema.
