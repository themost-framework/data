# Calculating values

A field can be calculated based on other fields. The calculation is done using the `calculation` property. The value of the `calculation` property is an expression which is being used by `@themost/data` for calculating the final value.

The following example demonstrates how to calculate the value of a field based on other fields:

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

where `$multiply` dialect is being for calculating the product of two fields `target.price` and `target.quantity`.

The same specification is being for calculating the default value of a field. The following example demonstrates how to calculate the default value of a field based on other fields:

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

where `$multiply` dialect is being for calculating the product of two fields `target.price` and `target.quantity`.

The difference between `value` and `calculation` is that `value` is being used for calculating the default value of a field, while `calculation` is being used for calculating the value of a field after an insert or update operation.

## Arithmetic operators

The following arithmetic dialects are supported by `@themost/data`:

- `$add`: Adds two or more values.
- `$subtract`: Subtracts two values.
- `$multiply`: Multiplies two or more values.
- `$divide`: Divides two values.
- `$mod`: Returns the remainder of a division operation.

e.g. the following example demonstrates how to calculate the sum of two fields:

```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$add": [
            "$$target.price",
            "$$target.tax"
        ]
    }
}
```

or using constant values:

```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$add": [
            "$$target.price",
            0.23
        ]
    }
}
```

The syntax is the same as the previous example, but the second value is a constant value.
The arithmetic dialects are getting an array of values as an argument.


## Comparison operators

The following comparison dialects are supported by `@themost/data`:

- `$eq`: Returns true if two values are equal.
- `$ne`: Returns true if two values are not equal.
- `$gt`: Returns true if the first value is greater than the second value.
- `$gte`: Returns true if the first value is greater than or equal to the second value.
- `$lt`: Returns true if the first value is less than the second value.
- `$lte`: Returns true if the first value is less than or equal to the second value.

e.g. the following example demonstrates how to calculate the value of a field based on a comparison operation:

```json
{
    "name": "delivered",
    "title": "Delivered",
    "type": "Float",
    "calculation": {
        "$eq": [
            "$$target.orderStatus.alternateName",
            "OrderDelivered"
        ]
    }
}
```
where `$eq` dialect is being used for comparing the value of the field `target.orderStatus.alternateName` with the string value `OrderDelivered`.

The comparison dialects are getting an array of two values as an argument.

## Logical operators

The following logical dialects are supported by `@themost/data`:

- `$and`: Returns true if all expressions are true.
- `$or`: Returns true if any expression is true.

e.g. the following example demonstrates how to calculate the value of a field based on a logical operation:

```json
{
    "name": "closed",
    "title": "Closed",
    "type": "Float",
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
where `$and` dialect is being used for calculating the logical AND operation of two expressions.

The logical dialects are getting an array of expressions as an argument.

## Conditional operators

The following conditional dialects are supported by `@themost/data`:

- `$cond`: Returns the value of the second expression if the first expression is true, otherwise returns the value of the third expression.

e.g. the following example demonstrates how to calculate the value of a field based on a conditional operation:

```json
{
    "name": "effectiveStatus",
    "title": "Effective status",
    "type": "Text",
    "calculation": {
        "$cond": {
            if: {
                "$eq": [
                    "$$target.orderStatus.alternateName",
                    "OrderDelivered"
                ]
            },
            then: "Closed",
            else: "Open"
        }
    }
}
```
where `$cond` dialect is being used for calculating the value of the field `status` based on the value of the field `target.orderStatus.alternateName`.

`$cond` operation uses named properties `if`, `then` and `else` for defining the conditional operation.

## Mathematical functions

The following mathematical functions are supported by `@themost/data`:

- `$abs`: Returns the absolute value of a number.
- `$ceil`: Returns the smallest integer greater than or equal to a number.
- `$floor`: Returns the largest integer less than or equal to a number.
- `$round`: Returns the value of a number rounded to the nearest integer.

e.g. the following example demonstrates how to calculate the value of a field based on a mathematical function:

```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$round": {
            value: {
                "$multiply": [
                    "$$target.price",
                    "$$target.quantity"
                ]
            },
            place: 2
        }
    }
}
```
where `$round` dialect is being used for calculating the value of the field `total` based on the value of the fields `target.price` and `target.quantity`. The `place` property is being used for defining the number of decimal places.

## String functions

The following string functions are supported by `@themost/data`:

- `$concat`: Concatenates two or more strings.
- `$substring`: Returns a substring of a string.
- `$length`: Returns the length of a string.
- `$toLower`: Converts a string to lowercase.
- `$toUpper`: Converts a string to uppercase.
- `$trim`: Removes whitespace from the beginning and end of a string.

e.g. the following example demonstrates how to calculate the value of a field based on a string function:

```json
{
    "name": "fullName",
    "title": "Full name",
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
where `$concat` dialect is being used for concatenating the values of the fields `target.firstName` and `target.lastName`.

or

```json
{
    "name": "fullName",
    "title": "Full name",
    "type": "Text",
    "calculation": {
        "$concat": [
            "$$target.firstName",
            " ",
            {
                "$substring": {
                    value: "$$target.lastName",
                    start: 0,
                    length: 1
                }
            }
        ]
    }
}
```
where `$substring` dialect is being used for extracting the first character of the field `target.lastName`.

## Context variables

The following context variables are supported by `@themost/data`:

- `$$target`: Refers to the object being inserted or updated.
- `$$model`: Refers to an instance of `DataModel` class.
- `$$context`: Refers to an instance of `DataContext` class.

These variables can be used in the calculation expression for accessing the object being inserted or updated, the data model or the data context.

e.g. the following example demonstrates how to calculate the value of a field based on the object being inserted or updated:

```json
{
    "name": "fullName",
    "title": "Full name",
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
where `$$target` variable is being used for accessing the values of the fields `firstName` and `lastName` of the object being inserted or updated.

or 

```json
{
    "name": "additionalType",
    "type": "Text",
    "calculation": {
        "$value": "$$model.name"
    }
}
```

where `$$model` variable is being used for accessing the name of the data model.

## Date functions

The following date functions are supported by `@themost/data`:

- `$date`: Returns the current date and time.
- `$today`: Returns the current date. 
- `$now`: Returns the current date and time. The dialect `$now` is equivalent to `$date`.
- `$dateAdd`: Adds a number of days to a date.
- `$dateSubtract`: Subtracts a number of days from a date.
- `$year`: Returns the year of a date.
- `$month`: Returns the month of a date.
- `$dayOfMonth`: Returns the day of the month of a date.
- `$dayOfWeek`: Returns the day of the week of a date.
- `$hour`: Returns the hour of a date.
- `$minutes`: Returns the minute of a date.
- `$seconds`: Returns the second of a date.

e.g. the following example demonstrates how to calculate the value of a field based on a date function:

```json
{
    "name": "createdAt",
    "title": "Created at",
    "type": "DateTime",
    "calculation": {
        "$date": 1
    }
}
```
where `$date` dialect is being used for calculating the current date and time.

or

```json
{
    "name": "year",
    "title": "Year",
    "type": "Integer",
    "calculation": {
        "$year": {
            "date": "$$target.createdAt"
        }
    }
}
```
where `$year` dialect is being used for calculating the year of the field `target.createdAt`.

The `$dateAdd` and `$dateSubtract` dialects are being used for manipulating date values

```json
{
    "name": "expirationDate",
    "title": "Expiration date",
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
where `$dateAdd` dialect is being used for calculating the expiration date of the field `target.createdAt` by adding 30 days.

## UUID functions

The following UUID functions are supported by `@themost/data`:

- `$uuid`: Returns a new UUID.
- `$newGuid`: Returns a new GUID. The dialect `$newGuid` is equivalent to `$uuid`.
- `$toGuid`: Converts any value to a GUID.

e.g. the following example demonstrates how to calculate the value of a field based on a UUID function:

```json
{
    "name": "id",
    "title": "ID",
    "type": "Guid",
    "calculation": {
        "$uuid": 1
    }
}
```
where `$uuid` dialect is being used for calculating a new UUID.

or

```json
{
    "name": "id",
    "title": "ID",
    "type": "Guid",
    "calculation": {
        "$toGuid": {
            value: "$$target.code"
        }
    }
}
```
where `$toGuid` dialect is being used for converting a string value to a GUID.

## Conversion functions

The following conversion functions are supported by `@themost/data`:

- `$toString`: Converts any value to a string.
- `$toInt`: Converts a value to an integer.
- `$toDecimal`: Converts a value to a decimal.
- `$toDouble`: Converts a value to a double.

e.g. the following example demonstrates how to calculate the value of a field based on a conversion function:

```json
{
    "name": "total",
    "title": "Total",
    "type": "Number",
    "calculation": {
        "$toDouble": {
            value: "$$target.price"
        }
    }
}
```
where `$toDouble` dialect is being used for converting the value of the field `target.price` to a float.



