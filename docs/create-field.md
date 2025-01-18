
# Create a simple field

To create a simple field in your data model schema, you need to define the field's name, type, and any additional constraints or properties. Here is an example of how to define a simple field:

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
            "title": "Category"
            "description": "The category of the product."
        }
    ]
}
```

In this example:
- `name` specifies the name of the field.
- `type` defines the data type of the field.
- `nullable` indicates whether the field can be null.
- `editable` specifies whether the field can be modified.
- `readonly` specifies whether the field is read-only.
- `size` sets the maximum length of the string.

You can adjust these properties based on your specific requirements.

## Use primitive types

Primitive types are the basic data types that are built into the framework. These types include:

- `Text`: Represents a string of characters.
- `Number`: Represents a numerical value.
- `Boolean`: Represents a true or false value.
- `Date`: Represents a date value.
- `DateTime`: Represents a date and time value.
- `Integer`: Represents an integer value.
- `Float`: Represents a floating-point number.
- `Decimal`: Represents a decimal number.

Here is an example of how to use different primitive types in your schema:

```json
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
```

Read more about [primitive types](Primitive%20types.md).

In this example:
- `age` is defined as an integer.
- `isActive` is defined as a boolean.
- `createdAt` is defined as a date and time value.

These examples demonstrate how to use various primitive types to define fields in your data model schema.

## Define relationships

Relationships are an essential part of data modeling, as they establish connections between entities. There are three main types of relationships:

- One-to-One: Each record in one entity is associated with one record in another entity.

- One-to-Many: Each record in one entity is associated with multiple records in another entity.

- Many-to-Many: Multiple records in one entity are associated with multiple records in another entity.

### One-to-Many relationship

To define relationships in your data model schema, you need to specify the relationship type, the related entity, and any additional properties. Here is
an example of how to define an one-to-many relationship:

```json
{
    "name": "createdBy",
    "type": "User",
    "nullable": false
}
```

where `User` is the related entity. This example establishes a one-to-many relationship between the current entity and the `User` entity based on a foreign-key association defined in current model.

`@themost/data` framework will automatically generate a relationship between entities which is fully-described by the following definition:

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
                "associationType":"association",
                "parentModel":"User",
                "parentField":"id",
                "childModel":"Product",
                "childField":"createdBy",
                "cascade":"none"
            } 
        }
    ]
}
```

where `User.id` is the foreign key field that references the `User` entity and `Product.createdBy` is the field that holds the foreign key value. The `cascade` property specifies the cascade behavior for the relationship. The default value is `none`, which means that no cascading operations are performed and an error is thrown if the operation would result in a constraint violation. The possible values are:

- `none`: No cascading operations are performed.
- `delete`: When a record is deleted, all related records are also deleted.
- `null`: When a record is deleted, the foreign key value is set to null.
- `default`: When a record is deleted, the foreign key value is set to the default value, if any.

A one-to-many relationship can also be defined in the parent model as follows:

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

where `Product` entity has a collection of `orders` which is a one-to-many relationship with `Order` entity. The `Order.orderedItem` field is the foreign key field that references the `Product` entity.

### Many-to-Many relationship

To define a many-to-many relationship, you need to specify the relationship type, the related entity, and any additional properties. Here is an example of how to define a many-to-many relationship:

```json
{
    "name": "groups",
    "type": "Group"
}
```

where `Group` is the related entity. This example establishes a many-to-many relationship between the current entity and the `Group` entity based on a junction table. The junction table is automatically created by the framework to manage the relationship between the two entities.

`@themost/data` uses pluralization rules to determine if a defined relationship is a many-to-many relationship. If the relationship name is plural, the framework will automatically create a junction table to manage the relationship. For example, if the relationship name is `groups`, the framework will create a junction table to manage the relationship between the current entity and the `Group` entity.

The extracted relationship definition is as follows:

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
                "associationType":"junction",
                "parentModel":"Group",
                "parentField":"id",
                "childModel":"User",
                "childField":"id",
                "associationAdapter":"GroupMembers",
                "associatedObjectField":"group",
                "associatedValueField":"user",
                "cascade":"none"
            }
        }
    ]
}
```

where `GroupMembers` is the junction table that manages the relationship between the `User` and `Group` entities. The `associatedObjectField` and `associatedValueField` properties specify the foreign key fields in the junction table that reference the `Group` and `User` entities, respectively.

Even if a many-to-many association does not have typically a parent model `@themost/data`  uses the `parentModel` and `parentField` properties to define the parent model and the parent field of the relationship for supporting cascade operations.

The `GroupMembers` junction table is automatically created by the framework to manage the many-to-many relationship between the `User` and `Group` entities.

A many-to-many association may be defined also in parent model as follows:

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
                "associationType":"junction",
                "parentModel":"Group",
                "parentField":"id",
                "childModel":"User",
                "childField":"id",
                "associationAdapter":"GroupMembers",
                "associatedObjectField":"group",
                "associatedValueField":"user",
                "cascade":"none"
            }
        }
    ]
}
```

where `Group` entity has a collection of `members` which is a many-to-many relationship with `User` entity.

### One-to-One relationship

To define a one-to-one relationship, you need to specify the relationship type, the related entity, and any additional properties. Here is an example of how to define a one-to-one relationship:

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

where `ProductDimension` is the related entity. This example establishes a one-to-one relationship between the current entity and the `ProductDimension` entity based on a foreign-key association defined in the related model.

The `nested` attribute specifies that the related entity is nested within the current entity which means that the related entity is being created, updated, or deleted along with the current entity. This "embedded" behavior is useful for related entities that are parts of the current entity.

The `expandable` attribute specifies that the related entity can be expanded when querying the current entity. The `multiplicity` attribute specifies the multiplicity of the relationship, which should be `ZeroOrOne` for this type of association.

The schema of the `ProductDimension` model contains `product` field which is a foreign key field that references the `Product` entity.

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
            "fields": [
                "product"
            ]
        }
    ]
}
```

The field `product` is a foreign key field that references the `Product` entity. The `constraints` property specifies that the `product` field is unique.

There is also another option to define an one-to-one association between entities without having a foreign key defined.

Let's consider the following example:

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

where `madeIn` field is a one-to-one relationship with `Country` entity.  The `many` attribute specifies that the related entity is a collection of entities and should be treated as a many-to-many relationship. The `associationType` attribute specifies that the relationship is a junction table association. The `associationObjectField` and `associationValueField` properties specify the foreign key fields in the junction table that reference the `Product` and `Country` entities, respectively. The `multiplicity` attribute specifies the multiplicity of the relationship, which should be `ZeroOrOne` for this type of association.

The `mapping` property specifies the association type, the parent model, the parent field, the child model, and the child field of the relationship.

This operation -of defining a loose one-to-one association between two models- is useful when you want to define an one-to-one relationship without adding a new attribute in the current model. In any other case, you can simply define it by adding `madeIn` field in `Product` entity.

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



