# The nested property

The nested property of a `DataField` is a property that can be used to define an embedded object. 

e.g. `Party` has a property `address` of type `PostalAddress`.

```json
{
    "@id": "http://schema.org/Party",
    "name": "Party",
    "title": "Party",
    "description": "A party (e.g. person, organization, etc.) being hosted or attending an event.",
    "type": "Thing",
    "expandable": true,
    "nested": true,
    "fields": [
        {
            "@id": "http://schema.org/address",
            "name": "address",
            "title": "address",
            "description": "Physical address of the item.",
            "type": "PostalAddress",
            "expandable": true,
            "nested": true
        }
    ]
}
```

The `expandable` property is used to indicate that the property `address` will be included in results by default and it will be represented as an embedded object.

## Many-to-one nested object

A many-to-one nested object is a nested object which is being represented by a foreign-key association between models. e.g. The `address` property of `Party` is a many-to-one nested object where `address` property holds the primary key of the `PostalAddress` model.

If we try to extract the mapping of `Party.address` property, we will get the following result:

```json
{
    "@id": "http://schema.org/address",
    "name": "address",
    "title": "address",
    "description": "Physical address of the item.",
    "type": "PostalAddress",
    "expandable": true,
    "nested": true,
    "mapping": {
        "associationType": "association",
        "parentModel": "PostalAddress",
        "parentField": "id",
        "childModel": "Party",
        "childField": "address",
        "cascade": "delete",
    }
}
```

The parent model is the model that holds the primary key and the child model is the model that holds the foreign key e.g. `PostalAddress` is the parent model, `Party` is the child model and `address` is the foreign key.


