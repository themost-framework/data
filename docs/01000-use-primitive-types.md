---
title: Use primitive types in data models
summary: Choose built-in field types for text, numbers, dates, and other values in a data model.
category: Data models
readingTime: 5 minutes
---

# Use primitive types in data models

A field's `type` describes the kind of value it holds. Use a built-in primitive type for scalar values such as text, numbers, dates, or JSON. Define the field in the model's top-level `fields` array:

```json
{
  "name": "Product",
  "title": "Products",
  "version": "1.0",
  "fields": [
    { "name": "id", "type": "Counter", "primary": true },
    { "name": "name", "type": "Text", "size": 100, "nullable": false },
    { "name": "price", "type": "Number" },
    { "name": "dateCreated", "type": "DateTime" }
  ]
}
```

`size` sets a field's maximum size where applicable, and `nullable` controls whether it may be null. The model schema defaults `nullable` to `true`. The examples below describe the built-in types listed in `model-schema.json`; database representations can depend on the configured adapter.

## Select a type by value

| Type | Use it for |
| --- | --- |
| `Text` | General character data, such as names and descriptions. Use `size` to set a maximum size where needed. |
| `Boolean` | A true-or-false value. |
| `Integer` | A signed 32-bit integer. |
| `Short` | A signed 16-bit integer. |
| `Counter` | An automatically generated integer, commonly used as a primary key. |
| `Number` | A general numeric value. |
| `Float` | A single-precision 32-bit floating-point value. |
| `Date` | A date value when a time of day is not needed. |
| `DateTime` | A date and time value, such as a creation timestamp. |
| `Time` | A time of day. |
| `Duration` | A duration represented as text, such as `P10D` or `-PT2H30M0S`. |
| `URL`, `AbsoluteURI`, `RelativeURI` | Text values representing a URL or an absolute or relative URI. |
| `Email` | Text representing an email address. |
| `Language` | A natural-language identifier. |
| `Guid` | A globally unique identifier. |
| `Model` | A model name stored as a scalar value. |
| `Object` | A generic object reference. |
| `Json` | An untyped JSON value. |

### Choose a numeric range

Use `Integer` or `Number` when their general value ranges fit. The constrained numeric types express an intended sign range:

| Type | Intended values |
| --- | --- |
| `PositiveInteger` | Integers greater than zero. |
| `NonNegativeInteger` | Integers greater than or equal to zero. |
| `NegativeInteger` | Integers less than zero. |
| `NonPositiveInteger` | Integers less than or equal to zero. |
| `PositiveNumber` | Numbers greater than zero. |
| `NonNegativeNumber` | Numbers greater than or equal to zero. |
| `NegativeNumber` | Numbers less than zero. |
| `NonPositiveNumber` | Numbers less than or equal to zero. |

These types describe value expectations in the data type catalog; do not assume they create a database check constraint. Use database-specific mechanisms when a rule must be enforced by the database.

## Distinguish primitive values from associations

`Model` is a primitive type for storing a model name as a value. To refer to another model's records, use that model's name as the field type instead. For example, a `Product` field whose type is `Category` is model-valued and represents an association, not a scalar primitive. See [Define associations between data models](003-define-model-associations.md) for association examples.

The schema also accepts type names outside its built-in list. Use such a type only when the application or its data adapter defines and supports it.

## Summary

Choose a primitive type that matches the value the field represents: use `Date` for date-only values, `DateTime` for timestamps, an integer type for whole numbers, `Number` for general numeric values, and `Json` for untyped JSON. Set field options such as `size` and `nullable` as needed, and use a model name as the type when defining an association rather than storing a scalar value.
