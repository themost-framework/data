---
index: 200
title: Define field types
summary: A guide to the built-in scalar field types in @themost/data, when to use them, and how model-valued fields differ from scalar types.
category: Data models
readingTime: 5 minutes
---

# Define field types

A model field's `type` describes the kind of value the field represents. The built-in types declared by `model-schema.json` cover strings, numbers, dates, and JSON. Fields may also use another model's name as their type to describe an association.

## Built-in scalar types

The model schema lists the following built-in types. Their representations and descriptions are defined in the repository's `dataTypes.json`.

| Type | Meaning and suitable use |
| --- | --- |
| `Boolean` | A true/false value, such as a flag. |
| `Date` | A date-only value, such as a birth date or order date when a time is not needed. |
| `DateTime` | A date and time value, such as when an item was created. |
| `Time` | A time of day that recurs daily, such as a store's opening time. |
| `Duration` | A text duration in the form shown by the type definition, for example `P10D` or `-PT2H30M0S`. |
| `Integer` | A signed 32-bit integer. |
| `Short` | A signed 16-bit integer. |
| `Counter` | An automatically generated integer; commonly used for an identifier. |
| `Float` | A single-precision 32-bit floating-point value. |
| `Number` | A general numeric value, useful when an integer-only type is not appropriate. |
| `NegativeInteger`, `NonNegativeInteger`, `NonPositiveInteger`, `PositiveInteger` | Integer variants whose names indicate whether values must be below zero, at least zero, at most zero, or above zero. |
| `NegativeNumber`, `NonNegativeNumber`, `NonPositiveNumber`, `PositiveNumber` | Numeric variants with the corresponding sign restriction. |
| `Text` | A sequence of characters; use for names, descriptions, and other general text. |
| `URL` | A reference to a web resource. |
| `AbsoluteURI`, `RelativeURI` | A text URI intended to be absolute or relative, respectively. |
| `Email` | Text representing an email address. |
| `Language` | A natural-language identifier. |
| `Guid` | Text representing a globally unique identifier. |
| `Model` | Text representing the name of a data model. |
| `Object` | An integer-backed generic object reference. |
| `Json` | An untyped JSON value; use when a field needs to hold JSON rather than a single scalar value. |

The constrained numeric and text types have patterns or other properties in `dataTypes.json` that express their intended value shape. Choose the narrowest suitable type when that distinction matters to your model.

One repository detail to keep in mind: `dataTypes.json` also defines `IP` and `ObjectURI`, but neither appears in `model-schema.json`'s built-in type enum. The model schema permits non-enum type names, but check the configuration and validation behavior in your application before relying on these additional catalog entries.

## Examples from the repository

These field definitions are drawn from the models in `spec/test2/config/models`:

```json
{ "name": "id", "type": "Counter", "primary": true }
{ "name": "discount", "type": "Number" }
{ "name": "isGift", "type": "Boolean" }
{ "name": "dateCreated", "type": "DateTime", "value": { "$now": 1 } }
{ "name": "tags", "type": "Json" }
```

For example, `Order.json` uses `Counter` for its primary key, `Number` for a discount, `Boolean` for its gift flag, and `Json` for tags. `Thing.json` uses a `DateTime` field with a `$now` default. A `Date` field is used for `dateCreated` in `Order.json`, illustrating the date-only alternative.

## Model-valued fields are associations

A field whose type is another model's name represents a model-valued field, not the scalar `Model` type. For example, `Person.json` uses `Place` as the type of `workLocation`, and `Organization` for `worksFor` with `"many": true`. It also marks `homeLocation` as `"nested": true`. Use a model name when a field refers to an entity or collection of entities; use the scalar `Model` type when the value itself is a model-name string.

The schema's `type` definition permits values outside its built-in type list, and repository models use this for associations such as `Person`, `Place`, and `Order`. Association behavior can be further described with field properties such as `many`, `nested`, and `mapping`.

## Summary

Use scalar field types to communicate the value shape you need: `Date` for dates without times, `DateTime` for timestamps, `Integer` or `Counter` for integer values, `Number` for general numeric values, and `Json` for untyped JSON. Use another model's name for an association, not the scalar `Model` type. The built-in type list and semantics here follow `model-schema.json` and `dataTypes.json`; consult the referenced model examples when choosing field properties for associations.
