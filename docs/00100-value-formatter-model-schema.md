---
title: Working with ValueFormatter in Model Schemas
summary: Learn how model field defaults and calculations use ValueFormatter expressions, which operators are available, and how to write practical schema examples.
category: Data models
readingTime: 7 minutes
---

# Working with ValueFormatter in Model Schemas

`ValueFormatter` evaluates declarative value expressions used by data models. A field can use an expression to compute a default when a value is needed, or to calculate a value from an expression. The formatter supports literal values, built-in operations, context-aware values such as the current date and user, and queries.

This article describes the expression syntax implemented by `ValueFormatter.js` and the corresponding field definitions in `model-schema.json`.

## Where expressions go

In a model JSON file, put an expression on a field's `value` or `calculation` property:

```json
{
  "name": "DisplayName",
  "type": "Text",
  "value": {
    "$concat": [
      "Guest ",
      { "$toString": { "value": { "$value": 1 } } }
    ]
  }
}
```

The schema allows either a string or a value-expression object for both properties. In `ValueFormatter.js`, `format(expression)` returns a promise for the resolved result. A plain string is a literal; it is not treated as JavaScript. An object expression normally has one operator property, such as `$concat`, `$now`, or `$value`.

The `Thing` model in `spec/test2/config/models/Thing.json` demonstrates common built-ins:

```json
{ "name": "dateCreated", "type": "DateTime", "value": { "$now": 1 } }
{ "name": "dateModified", "type": "DateTime",
  "value": { "$now": 1 }, "calculation": { "$now": 1 } }
{ "name": "createdBy", "type": "User", "value": { "$user": 1 } }
{ "name": "modifiedBy", "type": "User",
  "value": { "$user": 1 }, "calculation": { "$user": 1 } }
```

These expressions use the current date/time and current user identifier. The same model also has `additionalType.value` set to `"javascript:return this.model.name;"`. That is a legacy string value, not a `ValueFormatter` expression: formatter strings are literals unless they use supported expression syntax. Do not assume arbitrary JavaScript in a schema value will be executed by `ValueFormatter`.

## Expression forms and argument options

### Literal values and variables

Use `$value` to explicitly return a literal value, including a string that might otherwise look like an expression:

```json
{ "$value": "Pending" }
```

In code, a string beginning with `$$` is treated as a formatter variable. The formatter first looks for the name on its value dialect; for example `$$context` addresses the dialect's context. If a variable is not a built-in dialect property, asynchronous `formatVariable()` emits the `resolvingVariable` `resolve` event and accepts a value supplied on the event object. If no listener supplies it, formatting fails with a variable-not-found error. `formatVariableSync()` does not emit this event.

### Calls and arguments

Operators are named after dialect methods and start with `$`. For array arguments, items are evaluated in order and passed positionally:

```json
{ "$concat": ["Order ", { "$value": "42" }] }
```

For named arguments, use an object whose keys match the method's parameter names:

```json
{
  "$dateAdd": {
    "startDate": { "$now": 1 },
    "unit": "day",
    "amount": 7
  }
}
```

Nested expressions are evaluated before their containing operation. Follow the argument types in `model-schema.json`: raw strings are accepted where the schema allows strings, but numeric, boolean, or `null` operands generally need to be wrapped in `$value`. Numeric options defined by an operator, such as `amount`, `place`, `start`, `length`, `min`, and `max`, remain ordinary numbers. At runtime, an operator whose entire argument payload is `null` resolves to `null`, though that form may not pass schema validation. `$cond` has a special object form with required `if`, `then`, and `else` members:

```json
{
  "$cond": {
    "if": { "$gt": [{ "$value": 10 }, { "$value": 0 }] },
    "then": "Positive",
    "else": "Not positive"
  }
}
```

The condition is evaluated and the selected result is returned. Use the schema's argument names and shapes for each operator; for example `$round` takes `value` and `place`, while `$substring` takes `value`, `start`, and `length`.

## Built-in operations

The `ValueDialect` implementation provides the following groups of operations. The exact method names are the `$`-prefixed names below.

| Purpose | Operations and behavior |
| --- | --- |
| Date and time | `$date` and `$now` return the current date/time; `$today` returns the start of today. `$dateAdd` and `$dateSubtract` take `startDate`, `unit`, and `amount`. `$year`, `$month`, `$dayOfMonth`, `$dayOfWeek`, `$hour`, `$minutes`, and `$seconds` extract parts from a date. |
| User and identifiers | `$user` and `$me` return the current user's `id` by default, or a requested property. `$newGuid`/`$uuid` create a GUID; `$newid` gets a new model identifier. |
| Strings | `$concat` joins arguments; `$toLower`/`$toLowerCase`, `$toUpper`/`$toUpperCase`, `$trim`, `$length`, and `$substring` transform or inspect strings. `$toString` converts to a string, returning `null` for nullish input. `$replaceOne` replaces the first match and `$replaceAll` replaces all matches using a regular expression. |
| Numbers | `$abs`, `$ceil`, `$floor`, `$round`, `$add`, `$subtract`, `$multiply`, `$divide`, and `$mod` perform numeric operations. `$toInt`, `$toDouble`, and `$toDecimal` parse numeric values. |
| Comparisons and logic | `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$and`, and `$or` evaluate comparisons or logical operations. |
| Generated values | `$randomString`/`$chars`, `$randomNumbers`/`$numbers`, `$randomInt`/`$int`, and `$randomPassword`/`$password` produce random values. Their length or range is passed as named arguments. |
| Identifiers | `$toGuid`/`$toUUID` preserve a valid GUID or derive one from the input. |

For example, a rounded calculation can combine arithmetic operators:

```json
{
  "name": "Total",
  "type": "Number",
  "calculation": {
    "$round": {
      "value": {
        "$add": [
          { "$value": 12.345 },
          { "$value": 0.5 }
        ]
      },
      "place": 2
    }
  }
}
```

For `$user`/`$me`, pass `{ "property": "name" }` to request a property instead of the default identifier. Date arithmetic uses Moment.js units such as `"day"` or `"month"`. `$round` uses the supplied decimal place. Check null behavior when designing expressions: for example, case conversion and replacement preserve null, `$length` returns `0` for null, and numeric conversion follows JavaScript parsing behavior.

The schema file describes expression shapes and defaults, but the runtime implementation is the authority for executable operator names. For instance, the schema currently mentions `$randomNumber` (singular), while the dialect methods are `$randomNumbers` and `$numbers`; use the implemented names.

## Query expressions

`$query` evaluates a query and returns its scalar value. Its object must include a collection, a selected value, and a where clause:

```json
{
  "$query": {
    "$collection": "Product",
    "$select": { "value": "$price" },
    "$where": { "active": true }
  }
}
```

The formatter builds a query against the named model. `$select.value` is required and identifies the selected attribute; `$where` is also required. Optional `$order` and `$group` arrays are applied when present. In query conditions (and order/group expressions), a single-dollar field reference such as `"$price"` is resolved to a model attribute; dotted references can identify nested attributes. Missing attributes cause an error. This field-reference behavior is specific to query processing—ordinary strings in other formatter expressions remain literals.

## Extending the dialect

Applications can add dialect methods with `ValueFormatter.register(name, definition)`, which assigns the supplied methods to `ValueDialect.prototype`. A registered method can then be used as an operator in expressions, with array arguments passed positionally or object arguments matched to its parameter names. Keep custom operations deterministic where possible, and validate their input because expressions may be loaded from model configuration.

## Summary

Model field `value` and `calculation` properties accept either literal strings or structured `ValueFormatter` expressions. Use `$`-prefixed operators for built-in behavior, `$value` for explicit literals, and the documented named or positional argument shapes for options. The repository's `Thing` model is a practical reference for date and user defaults. Before relying on an operator, compare its name and behavior with `ValueFormatter.js`; the JSON schema documents accepted shapes but can drift from the runtime implementation.
