# Use primitive types

A data model attribute may be of a primitive type. Primitive types are the basic types of data, such as `Text`, `Integer`, `Boolean`, `Date`, etc.

## Text

Defines a VARCHAR column.

```json
{
  "name": "name",
  "type": "Text"
}
```

`size` is an optional attribute that defines the size of the VARCHAR column.

```json
{
  "name": "name",
  "type": "Text",
  "size": 100
}
```

`nullable` is an optional attribute that defines if the column can be null.

```json
{
  "name": "giveName",
  "type": "Text",
  "nullable": false
}
``

## Boolean

Defines a BOOLEAN column.

```json
{
  "name": "active",
  "type": "Boolean"
}
```

## Integer

Defines an INTEGER column.

```json
{
  "name": "age",
  "type": "Integer"
}
```

There are several subtypes of `Integer`:

### PositiveInteger

Defines a positive INTEGER column.

```json
{
  "name": "age",
  "type": "PositiveInteger"
}
```

### NegativeInteger

Defines a negative INTEGER column.

```json
{
  "name": "age",
  "type": "NegativeInteger"
}
``` 

### NonPositiveInteger

Defines a non-positive INTEGER column.

```json
{
  "name": "age",
  "type": "NonPositiveInteger"
}
``` 

### NonNegativeInteger 

Defines a non-negative INTEGER column.

```json
{
  "name": "age",
  "type": "NonNegativeInteger"
}
```

## Number

Defines a NUMERIC column.

```json
{
  "name": "price",
  "type": "Number"
}
```

`size` and `precision` are optional attributes that define the size and precision of the NUMERIC column.

```json
{
  "name": "price",
  "type": "Number",
  "size": 10,
  "precision": 2
}
```

There are several subtypes of `Number`:

### PositiveNumber

Defines a positive NUMERIC column.

```json
{
  "name": "price",
  "type": "PositiveNumber"
}
``` 

### NegativeNumber

Defines a negative NUMERIC column.

```json
{
  "name": "scale",
  "type": "NegativeNumber"
}
```

### NonPositiveNumber

Defines a non-positive NUMERIC column.

```json
{
  "name": "scale",
  "type": "NonPositiveNumber"
}
``` 

### NonNegativeNumber

Defines a non-negative NUMERIC column.

```json
{
  "name": "scale",
  "type": "NonNegativeNumber"
}
```

## Float

Defines a single-precision 32-bit floating point column in the database.

```json
{
  "name": "price",
  "type": "Float"
}
```

## Short

Defines a 16-bit signed integer column in the database.

```json
{
  "name": "age",
  "type": "Short"
}
```

## Counter

Defines an auto-increment identity column.

```json
{
  "name": "id",
  "type": "Counter"
}
```

## Date

Defines a DATE column.

```json
{
  "name": "birthDate",
  "type": "Date"
}
``` 

## DateTime

Defines a DATETIME column.

```json
{
  "name": "dateCreated",
  "type": "DateTime"
}
``` 

## Duration

Defines a VARCHAR column which follows ISO8601 Duration format [https://en.wikipedia.org/wiki/ISO_8601#Durations](https://en.wikipedia.org/wiki/ISO_8601#Durations)

```json
{
  "name": "duration",
  "type": "Duration"
}
```

## Time

Defines a VARCHAR column which follows ISO8601 Time format

```json
{
  "name": "time",
  "type": "Time"
}
```

## URL

Defines a VARCHAR column which follows RFC3986 URL format [https://tools.ietf.org/html/rfc3986](https://tools.ietf.org/html/rfc3986)

```json
{
  "name": "url",
  "type": "URL"
}
```

## AbsoluteURI

Defines a VARCHAR column which follows RFC3986 Absolute URI format [https://tools.ietf.org/html/rfc3986](https://tools.ietf.org/html/rfc3986)

```json
{
  "name": "absoluteUri",
  "type": "AbsoluteURI"
}
```

## IP

Defines a VARCHAR column which follows RFC5322 IP format [https://tools.ietf.org/html/rfc5322](https://tools.ietf.org/html/rfc5322)

```json
{
  "name": "address",
  "type": "IP"
}
```

## Email

Defines a VARCHAR column which follows RFC5322 Email format [https://tools.ietf.org/html/rfc5322](https://tools.ietf.org/html/rfc5322)

```json
{
  "name": "email",
  "type": "Email"
}
```

## Language

Defines a VARCHAR column which follows ISO 639-1 Language format [https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)

```json
{
  "name": "language",
  "type": "Language"
}
``` 

## Guid

Defines a VARCHAR or UUID column which follows GUID format [https://en.wikipedia.org/wiki/Universally_unique_identifier](https://en.wikipedia.org/wiki/Universally_unique_identifier)

```json
{
  "name": "guid",
  "type": "Guid"
}
```



