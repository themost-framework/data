---
title: Calculate values with expressions
summary: Define default and calculated field values with built-in expression dialects, context variables, queries, and custom functions.
category: Data models
readingTime: 12 minutes
---

# Calculate values with expressions

Model fields can derive values from other fields or from the current data context. In a model schema, use `value` to define a default or `calculation` to define a value calculated during an insert or update. Both properties use the same expression syntax.

For example, this field calculates a line total from the values on the object being written:

```json
{
  "name": "total",
  "title": "Total",
  "type": "Float",
  "calculation": {
    "$multiply": [
      "$$target.price",
      "$$target.quantity"
    ]
  }
}
```

Use `value` instead when the expression provides a default:

```json
{
  "name": "total",
  "title": "Total",
  "type": "Float",
  "value": {
    "$multiply": [
      "$$target.price",
      "$$target.quantity"
    ]
  }
}
```

The expression is the same in both examples; the property determines whether it supplies a default (`value`) or a calculated field value (`calculation`).

## Expression syntax and context

An expression is usually an object whose key is a dialect name beginning with `$`. The corresponding value supplies the dialect's arguments. Arguments can be constants, references to context variables, arrays of expressions, or nested dialects.

Use these context variables to refer to the current operation:

| Variable | Refers to |
| --- | --- |
| `$$target` | The object being inserted or updated. Append field names, such as `$$target.price`, to read its values. |
| `$$model` | The current `DataModel` instance. |
| `$$context` | The current `DataContext` instance. |

For example, `$$model.name` resolves to the current model's name. A `$value` expression returns the literal value it receives or resolves a context variable:

```json
{
  "name": "additionalType",
  "type": "Text",
  "calculation": {
    "$value": "$$model.name"
  }
}
```

Use nested expressions to compose operations. This expression joins two fields with a space:

```json
{
  "name": "fullName",
  "type": "Text",
  "calculation": {
    "$concat": [
      "$$target.firstName",
      " ",
      "$$target.lastName"
    ]
  }
}
```

## Arithmetic operations

Arithmetic dialects take an array of arguments. Constants can be mixed with field references, as shown in the `$add` expression below.

| Dialect | Purpose |
| --- | --- |
| `$add` | Add values. |
| `$subtract` | Subtract values. |
| `$multiply` | Multiply values. |
| `$divide` | Divide values. |
| `$mod` | Calculate a remainder. |

```json
{
  "name": "totalWithTax",
  "type": "Float",
  "calculation": {
    "$add": [
      "$$target.price",
      "$$target.tax",
      0.23
    ]
  }
}
```

**Implementation note:** The current dialect implementation folds `$subtract`, `$divide`, and `$mod` from initial values of `0`, `1`, and `0`, respectively. As a result, these operations do not behave like conventional two-operand subtraction, division, and remainder. Verify the behavior of the installed version before relying on the conventional meanings listed in the table for these three dialects. `$add` and `$multiply` use the usual initial values of `0` and `1`.

## Comparisons and logical operations

Comparison dialects take two arguments and return a boolean:

| Dialect | Result |
| --- | --- |
| `$eq` | `true` when the values are strictly equal. |
| `$ne` | `true` when the values are not strictly equal. |
| `$gt` | `true` when the first value is greater than the second. |
| `$gte` | `true` when the first value is greater than or equal to the second. |
| `$lt` | `true` when the first value is less than the second. |
| `$lte` | `true` when the first value is less than or equal to the second. |

For example, a comparison can determine whether an order has been delivered:

```json
{
  "name": "delivered",
  "type": "Boolean",
  "calculation": {
    "$eq": [
      "$$target.orderStatus.alternateName",
      "OrderDelivered"
    ]
  }
}
```

Logical dialects take an array of expressions:

| Dialect | Result |
| --- | --- |
| `$and` | `true` when every expression is truthy. |
| `$or` | `true` when at least one expression is truthy. |

Combine comparisons to require both delivery and payment:

```json
{
  "name": "closed",
  "type": "Boolean",
  "calculation": {
    "$and": [
      {
        "$eq": [
          "$$target.orderStatus.alternateName",
          "OrderDelivered"
        ]
      },
      {
        "$eq": [
          "$$target.paymentStatus.alternateName",
          "PaymentReceived"
        ]
      }
    ]
  }
}
```

## Conditional expressions

`$cond` selects one of two values. Supply its `if`, `then`, and `else` arguments as named properties:

```json
{
  "name": "status",
  "type": "Text",
  "calculation": {
    "$cond": {
      "if": {
        "$eq": [
          "$$target.orderStatus.alternateName",
          "OrderDelivered"
        ]
      },
      "then": "Closed",
      "else": "Open"
    }
  }
}
```

The formatter evaluates the three expressions. The truthiness of `if` determines whether the result is `then` or `else`.

## Mathematical functions

These dialects accept a value directly. `$round` also accepts the optional `place` argument to specify the number of decimal places:

| Dialect | Purpose |
| --- | --- |
| `$abs` | Return the absolute value. |
| `$ceil` | Round up to an integer. |
| `$floor` | Round down to an integer. |
| `$round` | Round to the requested decimal place. |

For example, round the product of price and quantity to two decimal places:

```json
{
  "name": "total",
  "type": "Float",
  "calculation": {
    "$round": {
      "value": {
        "$multiply": [
          "$$target.price",
          "$$target.quantity"
        ]
      },
      "place": 2
    }
  }
}
```

## String functions

| Dialect | Purpose |
| --- | --- |
| `$concat` | Join two or more values as a string. |
| `$substring` | Return part of a string. |
| `$length` | Return the string length (zero for a null value). |
| `$toLower` | Convert a value to lowercase text. |
| `$toUpper` | Convert a value to uppercase text. |
| `$trim` | Remove whitespace at the beginning and end of a value. |
| `$replaceOne` | Replace the first matching substring. |
| `$replaceAll` | Replace all matches. |

This example builds a full name:

```json
{
  "name": "fullName",
  "type": "Text",
  "calculation": {
    "$concat": [
      "$$target.firstName",
      " ",
      "$$target.lastName"
    ]
  }
}
```

`$substring` accepts the named arguments `value`, `start`, and `length`. The implementation passes `start` and `length` to JavaScript's `substring(start, end)` method, so `length` is used as the ending index rather than as a character count. For example, `start: 0` and `length: 1` return the first character:

```json
{
  "name": "initial",
  "type": "Text",
  "calculation": {
    "$substring": {
      "value": "$$target.lastName",
      "start": 0,
      "length": 1
    }
  }
}
```

Unary dialects can be nested inside `$concat`. For example, the following expression combines a first name with the initial of a last name:

```json
{
  "name": "displayName",
  "type": "Text",
  "calculation": {
    "$concat": [
      "$$target.firstName",
      " ",
      {
        "$substring": {
          "value": "$$target.lastName",
          "start": 0,
          "length": 1
        }
      }
    ]
  }
}
```

## Date and time functions

| Dialect | Purpose |
| --- | --- |
| `$date` | Return the current date and time. |
| `$now` | Alias for `$date`. |
| `$today` | Return the current date at the start of the day. |
| `$dateAdd` | Add an amount of time to a date. |
| `$dateSubtract` | Subtract an amount of time from a date. |
| `$year` | Return the year component. |
| `$month` | Return the month component. |
| `$dayOfMonth` | Return the day of the month. |
| `$dayOfWeek` | Return the day of the week. |
| `$hour` | Return the hour component. |
| `$minutes` | Return the minute component. |
| `$seconds` | Return the second component. |

In schema expressions, the current-time dialects take an argument such as `1`:

```json
{
  "name": "createdAt",
  "type": "DateTime",
  "calculation": {
    "$date": 1
  }
}
```

`$dateAdd` and `$dateSubtract` take the named arguments `startDate`, `unit`, and `amount`. The date arithmetic uses Moment.js units; for example, add 30 days as follows:

```json
{
  "name": "expirationDate",
  "type": "DateTime",
  "calculation": {
    "$dateAdd": {
      "startDate": "$$target.createdAt",
      "unit": "day",
      "amount": 30
    }
  }
}
```

To subtract an interval, use the same arguments with `$dateSubtract`:

```json
{
  "name": "reminderDate",
  "type": "DateTime",
  "calculation": {
    "$dateSubtract": {
      "startDate": "$$target.createdAt",
      "unit": "day",
      "amount": 30
    }
  }
}
```

Date-part functions take a named `date` argument:

```json
{
  "name": "year",
  "type": "Integer",
  "calculation": {
    "$year": {
      "date": "$$target.createdAt"
    }
  }
}
```

The implementation uses Moment.js date parts: `$month` is zero-based (`0` for January), and `$dayOfWeek` returns `0` for Sunday through `6` for Saturday.

## UUID and conversion functions

| Dialect | Purpose |
| --- | --- |
| `$uuid` | Generate a new GUID. |
| `$newGuid` | Alias for `$uuid`. |
| `$toGuid` | Return a GUID for a value. |
| `$toUUID` | Alias for `$toGuid`. |
| `$toString` | Convert a non-null value to a string. |
| `$toInt` | Parse an integer from a value. |
| `$toDecimal` | Parse a floating-point number from a value. |
| `$toDouble` | Parse a floating-point number from a value. |

Generate a new GUID with `$uuid`:

```json
{
  "name": "id",
  "type": "Guid",
  "calculation": {
    "$uuid": 1
  }
}
```

`$toGuid` returns an existing GUID unchanged. For other values, the current implementation derives a GUID-formatted value from an MD5 digest. This conversion is deterministic; it is not a cryptographic identity or security mechanism:

```json
{
  "name": "externalId",
  "type": "Guid",
  "calculation": {
    "$toGuid": {
      "value": "$$target.code"
    }
  }
}
```

Conversion dialects accept a named `value` argument when their input is an object:

```json
{
  "name": "code",
  "type": "Text",
  "calculation": {
    "$toString": {
      "value": "$$target.id"
    }
  }
}
```

## Random values and current user

| Dialect | Purpose |
| --- | --- |
| `$randomString` | Generate a random string; `length` defaults to 8. |
| `$chars` | Alias for `$randomString`. |
| `$randomNumbers` | Generate a random digit string; `length` defaults to 8. |
| `$numbers` | Alias for `$randomNumbers`. |
| `$randomInt` | Generate a random integer between `min` and `max`. |
| `$int` | Alias for `$randomInt`. |
| `$randomPassword` | Generate a random password; `length` defaults to 16. |
| `$password` | Alias for `$randomPassword`. |
| `$user` | Return the current user's `id`, or a requested property. |
| `$me` | Alias for `$user`. |
| `$newid` | Request a new identifier for the current model. |

For example, generate a short code:

```json
{
  "name": "code",
  "type": "Text",
  "calculation": {
    "$randomString": {
      "length": 8
    }
  }
}
```

The random string and password dialects accept a `length` argument. `$randomInt` accepts `min` and `max`:

```json
{
  "name": "verificationCode",
  "type": "Number",
  "calculation": {
    "$randomInt": {
      "min": 1000,
      "max": 9999
    }
  }
}
```

Generate a password of a requested length with `$randomPassword`:

```json
{
  "name": "temporaryPassword",
  "type": "Text",
  "calculation": {
    "$randomPassword": {
      "length": 12
    }
  }
}
```

By default, `$user` returns the current user's identifier. To read another value, pass the requested property as a named argument:

```json
{
  "name": "userName",
  "type": "Text",
  "calculation": {
    "$user": {
      "property": "name"
    }
  }
}
```

`$newid` requests a new identifier from the current model's data source. Use it for a primary key that is not auto-incremented:

```json
{
  "name": "id",
  "type": "Integer",
  "primary": true,
  "calculation": {
    "$newid": 1
  }
}
```

Random password generation is not a substitute for a password-generation policy. The current implementation uses random character selection and does not guarantee that every generated value contains the requested mix of character classes.

## Query expressions

Use `$query` to calculate a value from another model. Its query object requires `$collection`, `$select`, and `$where`. `$select` must contain a `value` property; `$order` and `$group` may also be supplied as arrays.

This example sums the `price` values of related order rows. Replace `OrderItem` and `order` with the collection and relationship field names in the application's own model schema:

```json
{
  "name": "orderTotal",
  "type": "Float",
  "calculation": {
    "$query": {
      "$collection": "OrderItem",
      "$select": {
        "value": "$sum(price)"
      },
      "$where": {
        "order": "$$target.id"
      }
    }
  }
}
```

Specify the selected attribute in `$select.value`. The `$where` expression is evaluated against the queried model, and `$$target` can refer to the object being written.

## Define custom dialects

To create a reusable custom operation, add an asynchronous method to `ValueDialect` or register one with `ValueFormatter.register`. Custom methods should return a value or a promise that resolves to one.

You can name expression arguments in an object. The formatter maps those properties to the custom function's parameter names:

```json
{
  "name": "initials",
  "type": "Text",
  "calculation": {
    "$initials": {
      "first": "$$target.firstName",
      "last": "$$target.lastName"
    }
  }
}
```

Extend `ValueDialect` when custom behavior belongs on the dialect prototype:

```js
const { ValueDialect } = require("@themost/data");

Object.assign(ValueDialect.prototype, {
  async $initials(first, last) {
    return `${first.charAt(0)}${last.charAt(0)}`;
  }
});
```

Alternatively, register the method:

```js
const { ValueFormatter } = require("@themost/data");

ValueFormatter.register("initials", {
  async $initials(first, last) {
    return `${first.charAt(0)}${last.charAt(0)}`;
  }
});
```

The registration method takes a name and a definition object. When an expression supplies its arguments as an object, the custom method's parameter names must correspond to the object's keys.

## Conclusion

Use `value` for a default and `calculation` for a value derived during an insert or update. Compose dialects with context variables, constants, and nested expressions. Use the supported operation families for common calculations, or define an asynchronous custom dialect for application-specific behavior. Pay attention to implementation-specific details—especially arithmetic folding, substring indexes, and date-part numbering—and verify that model and relationship names in query expressions match the application's schema.
