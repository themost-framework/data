# Define associations

Each model can have associations with other models. There are 4 types of associations:

## Many to One

Defines a many-to-one association between two models. For example, a `Product` has many `Order`s.

```json
{
    "name": "orderedItem",
    "type": "Product",
    "expandable": false,
    "many": false,
    "mapping": {
        "parentModel": "Product",
        "parentField": "id",
        "associationType": "association",
        "cascade": "null"
    }
}
```

where `mapping` attribute holds the information about the association.

These attributes are optional and can be omitted. A shorthand for the above association is:

```json
{
    "name": "orderedItem",
    "type": "Product"
}
```

where `type` attribute is the name of the model that is associated with the current model e.g. an `Order` has a `Product` as an `orderedItem` and the association is defined in the `Order` model by using `id` field of the `Product` model.

## One to Many

Defines a one-to-many association between two models. For example, a `Product` has many `Order`s.

```json
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
        "cascade": "delete"
    }
}
```

where `mapping` attribute holds the information about the association:

> parentModel - the model that has the association

> parentField - the field of the parent model that is used for the association

> childModel - the model that is associated with the parent model

> childField - the field of the child model that is used for the association

> cascade - the cascade type for the association. Can be `delete` or `null`

`parentModel` and `parentField` are optional and can be omitted. A shorthand for the above association is:

```json
{
    "name": "orders",
    "type": "Order",
    "many": true,
    "mapping": {
        "childModel": "Order",
        "childField": "orderedItem",
        "associationType": "association",
        "cascade": "delete"
    }
}
```

where `type` attribute is the name of the model that is associated with the current model e.g. a `Product` has many `Order`s and the association is defined in the `Product` model by using `id` field of the `Product` model.

## Many to Many

Defines a many-to-many association between two models. For example, a `User` has many `Group`s.

```json
{
    "name": "groups",
    "type": "Group",
    "mapping": {
        "associationAdapter":"GroupMembers",
        "parentModel":"Group",
        "parentField":"id",
        "childModel":"User",
        "childField":"id",
        "associationType":"junction",
        "cascade":"delete"
    }
}
```

where `mapping` attribute holds the information about the association:

> associationAdapter - the name of the adapter that is used for the association

> parentModel - the model that has the association

> parentField - the field of the parent model that is used for the association

> childModel - the model that is associated with the parent model

> childField - the field of the child model that is used for the association

> cascade - the cascade type for the association. Can be `delete` or `none`. When the cascade is `delete`, then the associations are removed when the parent object or the child object is deleted.

> associationType - the type of the association. It must be `junction` for many-to-many associations

`parentField` and `childField` are optional and can be omitted. A shorthand for the above association is:

```json
{
    "name": "groups",
    "type": "Group",
    "mapping": {
        "associationAdapter":"GroupMembers",
        "associationType":"junction",
        "cascade":"delete"
    }
}
```

where `type` attribute is the name of the model that is associated with the current model e.g. a `User` has many `Group`s and the association is defined in the `User` model by using `id` field of the `User` model.

The `associationAdapter` is used to define the name of the database object that is going to be used for the association. For example, if the `associationAdapter` is `GroupMembers`, then the database object that is going to be used for the association is `GroupMembers`. This table will have two fields: `parentId` and `valueId` that are going to be used for the association. The `parentId` is the id of the parent model and the `valueId` is the id of the child model. 

The field names `parentId` and `valueId` are customizable and be configured:

```json

{
    "name": "groups",
    "type": "Group",
    "mapping": {
        "associationAdapter":"GroupMembers",
        "associationObjectField": "group",
        "associationValueField": "user",
        "associationType":"junction",
        "cascade":"delete"
    }
}

```

where `associationObjectField` holds the name of the field that is going to be used for the parent model and `associationValueField` is the name of the field that is going to be used for the child model.







