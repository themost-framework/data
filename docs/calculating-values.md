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

where `$multiply` dialect is being used for calculating the product of two fields `target.price` and `target.quantity`.

The same specification is being used by `@themost/data` for calculating the default value of a field. The following example demonstrates how to calculate the default value of a field based on other fields:

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

The difference between `value` and `calculation` is that `value` is being used for calculating the default value of a field, while `calculation` is being used for calculating the value of a field after any insert or update operation.

## Arithmetic operators

The following arithmetic dialects are supported by `@themost/data`:

### `$add`
Adds two or more values.
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
### `$subtract`
Subtracts two values.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$subtract": [
            "$$target.price",
            "$$target.discount"
        ]
    }
}
```
### `$multiply`
Multiplies two or more values.
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
### `$divide`
Divides two values.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$divide": [
            "$$target.price",
            "$$target.quantity"
        ]
    }
}
```
### `$mod`
Returns the remainder of a division operation.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$mod": [
            "$$target.price",
            "$$target.quantity"
        ]
    }
}
```

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

### `$eq`
Returns true if two values are equal.
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
### `$ne`
Returns true if two values are not equal.
```json
{
    "name": "delivered",
    "title": "Delivered",
    "type": "Float",
    "calculation": {
        "$ne": [
            "$$target.orderStatus.alternateName",
            "OrderDelivered"
        ]
    }
}
```
### `$gt`
Returns true if the first value is greater than the second value.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$gt": [
            "$$target.price",
            100
        ]
    }
}
```
### `$gte`
Returns true if the first value is greater than or equal to the second value.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$gte": [
            "$$target.price",
            100
        ]
    }
}
```
### `$lt`
Returns true if the first value is less than the second value.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$lt": [
            "$$target.price",
            100
        ]
    }
}
```
### `$lte`
Returns true if the first value is less than or equal to the second value.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$lte": [
            "$$target.price",
            100
        ]
    }
}
```

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

### `$and`
Returns true if all expressions are true.
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
### `$or`
Returns true if any expression is true.
```json
{
    "name": "closed",
    "title": "Closed",
    "type": "Float",
    "calculation": {
        "$or": [
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

### `$cond`
Returns the value of the second expression if the first expression is true, otherwise returns the value of the third expression.
```json
{
    "name": "status",
    "title": "Status",
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

where `$cond` dialect is being used for calculating the value of the field `status` based on the value of the field `target.orderStatus.alternateName`.

`$cond` operation uses named properties `if`, `then` and `else` for defining the conditional operation.

## Mathematical functions

The following mathematical functions are supported by `@themost/data`:

### `$abs`
Returns the absolute value of a number.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$abs": "$$target.price"
    }
}
```
### `$ceil`
Returns the smallest integer greater than or equal to a number.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$ceil": "$$target.price"
    }
}
```
### `$floor`
Returns the largest integer less than or equal to a number.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$floor": "$$target.price"
    }
}
```
### `$round`
Returns the value of a number rounded to the nearest integer.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$round": {
            "value": "$$target.price",
            "place": 2
        }
    }
}
```

e.g. the following example demonstrates how to calculate the value of a field based on a mathematical function:

```json
{
    "name": "total",
    "title": "Total",
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
where `$round` dialect is being used for calculating the value of the field `total` based on the value of the fields `target.price` and `target.quantity`. The `place` property is being used for defining the number of decimal places.

## String functions

The following string functions are supported by `@themost/data`:

### `$concat`
Concatenates two or more strings.
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
### `$substring`
Returns a substring of a string.
```json
{
    "name": "initial",
    "title": "Initial",
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
### `$length`
Returns the length of a string.
```json
{
    "name": "length",
    "title": "Length",
    "type": "Integer",
    "calculation": {
        "$length": "$$target.code"
    }
}
```
### `$toLower`
Converts a string to lowercase.
```json
{
    "name": "lower",
    "title": "Lower",
    "type": "Text",
    "calculation": {
        "$toLower": "$$target.code"
    }
}
```
### `$toUpper`
Converts a string to uppercase.
```json
{
    "name": "upper",
    "title": "Upper",
    "type": "Text",
    "calculation": {
        "$toUpper": "$$target.code"
    }
}
```
### `$trim`
Removes whitespace from the beginning and end of a string.
```json
{
    "name": "trimmed",
    "title": "Trimmed",
    "type": "Text",
    "calculation": {
        "$trim": "$$target.code"
    }
}
```

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
                    "value": "$$target.lastName",
                    "start": 0,
                    "length": 1
                }
            }
        ]
    }
}
```
where `$substring` dialect is being used for extracting the first character of the field `target.lastName`.

## Context variables

The following context variables are supported by `@themost/data`:

### `$$target`
Refers to the object being inserted or updated.
### `$$model`
Refers to an instance of `DataModel` class.
### `$$context`
Refers to an instance of `DataContext` class.

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

### `$date`
Returns the current date and time.
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
### `$today`
Returns the current date. 
```json
{
    "name": "createdAt",
    "title": "Created at",
    "type": "DateTime",
    "calculation": {
        "$today": 1
    }
}
```
### `$now`
Returns the current date and time. The dialect `$now` is equivalent to `$date`.
```json
{
    "name": "createdAt",
    "title": "Created at",
    "type": "DateTime",
    "calculation": {
        "$now": 1
    }
}
```
### `$dateAdd`
Adds a number of days to a date.
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
### `$dateSubtract`
Subtracts a number of days from a date.
```json
{
    "name": "expirationDate",
    "title": "Expiration date",
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
### `$year`
Returns the year of a date.
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
### `$month`
Returns the month of a date.
```json
{
    "name": "month",
    "title": "Month",
    "type": "Integer",
    "calculation": {
        "$month": {
            "date": "$$target.createdAt"
        }
    }
}
```
### `$dayOfMonth`
Returns the day of the month of a date.
```json
{
    "name": "dayOfMonth",
    "title": "Day of month",
    "type": "Integer",
    "calculation": {
        "$dayOfMonth": {
            "date": "$$target.createdAt"
        }
    }
}
```
### `$dayOfWeek`
Returns the day of the week of a date.
```json
{
    "name": "dayOfWeek",
    "title": "Day of week",
    "type": "Integer",
    "calculation": {
        "$dayOfWeek": {
            "date": "$$target.createdAt"
        }
    }
}
```
### `$hour`
Returns the hour of a date.
```json
{
    "name": "hour",
    "title": "Hour",
    "type": "Integer",
    "calculation": {
        "$hour": {
            "date": "$$target.createdAt"
        }
    }
}
```
### `$minutes`
Returns the minute of a date.
```json
{
    "name": "minutes",
    "title": "Minutes",
    "type": "Integer",
    "calculation": {
        "$minutes": {
            "date": "$$target.createdAt"
        }
    }
}
```
### `$seconds`
Returns the second of a date.
```json
{
    "name": "seconds",
    "title": "Seconds",
    "type": "Integer",
    "calculation": {
        "$seconds": {
            "date": "$$target.createdAt"
        }
    }
}
```

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

### `$uuid`
Returns a new UUID.
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
### `$newGuid`
Returns a new GUID. The dialect `$newGuid` is equivalent to `$uuid`.
```json
{
    "name": "id",
    "title": "ID",
    "type": "Guid",
    "calculation": {
        "$newGuid": 1
    }
}
```
### `$toGuid`
Converts any value to a GUID.
```json
{
    "name": "id",
    "title": "ID",
    "type": "Guid",
    "calculation": {
        "$toGuid": {
            "value": "$$target.code"
        }
    }
}
```

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
            "value": "$$target.code"
        }
    }
}
```
where `$toGuid` dialect is being used for converting a string value to a GUID.

## Conversion functions

The following conversion functions are supported by `@themost/data`:

### `$toString`
Converts any value to a string.
```json
{
    "name": "code",
    "title": "Code",
    "type": "Text",
    "calculation": {
        "$toString": {
            "value": "$$target.id"
        }
    }
}
```
### `$toInt`
Converts a value to an integer.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Integer",
    "calculation": {
        "$toInt": {
            "value": "$$target.price"
        }
    }
}
```
### `$toDecimal`
Converts a value to a decimal.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Decimal",
    "calculation": {
        "$toDecimal": {
            "value": "$$target.price"
        }
    }
}
```
### `$toDouble`
Converts a value to a double.
```json
{
    "name": "total",
    "title": "Total",
    "type": "Number",
    "calculation": {
        "$toDouble": {
            "value": "$$target.price"
        }
    }
}
```

e.g. the following example demonstrates how to calculate the value of a field based on a conversion function:

```json
{
    "name": "total",
    "title": "Total",
    "type": "Number",
    "calculation": {
        "$toDouble": {
            "value": "$$target.price"
        }
    }
}
```
where `$toDouble` dialect is being used for converting the value of the field `target.price` to a float.

## Other functions

The following functions are supported also by `@themost/data`:

### `$randomString`
Returns a random string.
```json
{
    "name": "code",
    "title": "Code",
    "type": "Text",
    "calculation": {
        "$randomString": {
            "length": 8
        }
    }
}
```
### `$randomInt`
Returns a random integer.
```json
{
    "name": "code",
    "title": "Code",
    "type": "Number",
    "calculation": {
        "$randomInt": {
            "min": 1000,
            "max": 9999
        }
    }
}
```
### `$user`
Returns the current user.
```json
{
    "name": "creator",
    "type": "Guid",
    "calculation": {
        "$user": 1
    }
}
```
### `$me`
Returns the current user. The dialect `$me` is equivalent to `$user`.
```json
{
    "name": "creator",
    "type": "Guid",
    "calculation": {
        "$me": 1
    }
}
```
### `$newid`
Returns a new identifier for the current model when the model primary key is not an auto-incremented value.
```json
{
    "name": "id",
    "title": "ID",
    "type": "Integer",
    "primary": true,
    "calculation": {
        "$newid": 1
    }
}
```

e.g. the following example demonstrates how to calculate the value of a field based on a random function:

```json
{
    "name": "code",
    "title": "Code",
    "type": "Text",
    "calculation": {
        "$randomString": {
            "length": 8
        }
    }
}
```
where `$randomString` dialect is being used for calculating a random string.

or 

```json
{
    "name": "creator",
    "type": "Guid",
    "calculation": {
        "$user": 1
    }
}
```
where `$user` dialect is being used for calculating the current user ID.

The `$user` dialect is getting also an optional parameter for getting an attribute other than user ID.

```json
{
    "name": "userName",
    "type": "Text",
    "calculation": {
        "$user": "name"
    }
}
```
where `$user` dialect is being used for calculating the current user name.

The `$randomPassword` dialect is being used for calculating a random password.

```json
{
    "name": "password",
    "type": "Text",
    "calculation": {
        "$randomPassword": {
            "length": 8
        }
    }
}
```

The `$randomInt` dialect is being used for calculating a random integer.

```json
{
    "name": "code",
    "title": "Code",
    "type": "Number",
    "calculation": {
        "$randomInt": {
            "min": 1000,
            "max": 9999
        }
    }
}
```

The `$newid` dialect is being used for calculating a new identifier for the current model.

```json
{
    "name": "id",
    "title": "ID",
    "type": "Integer",
    "primary": true,
    "calculation": {
        "$newid": 1
    }
}
```

## Query expressions

The following query expressions are supported by `@themost/data`:

### `$query`
Returns the result of a query expression.

```json
{
    "name": "total",
    "title": "Total",
    "type": "Float",
    "calculation": {
        "$query": {
            "$collection": "Order",
            "select": {
                "$sum": [
                    "$price"
                    ]
            },
            "where": {
                "ordererItem": "$$target.id"
            }
        }
    }
}
```
where `$query` dialect is being used for calculating the sum of the field `price` of the `Order` model based on the value of the field `target.id`.

## Custom functions

Use `ValueFormatter` class for defining custom functions.

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

where `$initials` dialect is being used for calculating the initials of the fields `target.firstName` and `target.lastName`.

Use `ValueDialect` class and extend it for defining custom functions.

```javascript
const { ValueDialect } = require('@themost/data');
Object.assign(ValueDialect.prototype, {
    async $initials(first, last) {
        return `${first.charAt(0)}${last.charAt(0)}`;
    }
});
```

A shorthand for defining custom functions is to use the `ValueFormatter.register` method.

```javascript
const { ValueFormatter } = require('@themost/data');
ValueFormatter.register({
        async $initials(first, last) => {
            return `${first.charAt(0)}${last.charAt(0)}`;
        }
    }
);
```

A custom dialect should be as an async function and return a value.

