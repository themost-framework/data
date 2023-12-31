# Create a simple data model

This tutorial will show you how to create a simple data model schema.

## Create a data model

To create a data model, you need to create a new file in the `config/models` directory. The file name will be the name of the data model. For example, if you want to create a data model called `Product`, you need to create a file called `Product.json`.

```json
{
    "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
    "name": "Product",
    "version": "2.1",
    "inherits": "Thing",
}
```

The `name` property is the name of the data model. The `version` property is the version of the data model. The `inherits` property is the name of the base data model. In this example, the `Product` data model inherits from the `Thing` data model. The `Thing` data model is a built-in data model that is used to represent any object in the system.

Let's see the json schema of `Thing` model

```json
{
    "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
    "@id": "http://schema.org/Thing",
    "name": "Thing",
    "description": "The most generic type of item.",
    "title": "Thing",
    "abstract": false,
    "sealed": false,
    "hidden": true,
    "version": "2.0",
    "fields": [{
            "@id": "http://schema.org/sameAs",
            "name": "sameAs",
            "title": "sameAs",
            "description": "URL of a reference Web page that unambiguously indicates the item's identity. E.g. the URL of the item's Wikipedia page, Wikidata entry, or official website.",
            "type": "URL"
        },
        {
            "@id": "http://schema.org/url",
            "name": "url",
            "title": "url",
            "description": "URL of the item.",
            "type": "URL"
        },
        {
            "@id": "http://schema.org/image",
            "name": "image",
            "title": "image",
            "description": "An image of the item. This can be a <a class=\"localLink\" href=\"http://schema.org/URL\">URL</a> or a fully described <a class=\"localLink\" href=\"http://schema.org/ImageObject\">ImageObject</a>.",
            "type": "Text"
        },
        {
            "@id": "http://schema.org/additionalType",
            "name": "additionalType",
            "title": "additionalType",
            "description": "An additional type for the item, typically used for adding more specific types from external vocabularies in microdata syntax. This is a relationship between something and a class that the thing is in. In RDFa syntax, it is better to use the native RDFa syntax - the 'typeof' attribute - for multiple types. Schema.org tools may have only weaker understanding of extra types, in particular those defined externally.",
            "type": "Text",
            "value": "javascript:return this.model.name;",
            "readonly": true
        },
        {
            "@id": "http://schema.org/name",
            "name": "name",
            "title": "name",
            "description": "The name of the item.",
            "type": "Text"
        },
        {
            "@id": "http://schema.org/identifier",
            "name": "identifier",
            "title": "identifier",
            "description": "The identifier property represents any kind of identifier for any kind of <a class=\"localLink\" href=\"http://schema.org/Thing\">Thing</a>, such as ISBNs, GTIN codes, UUIDs etc. Schema.org provides dedicated properties for representing many of these, either as textual strings or as URL (URI) links. See <a href=\"/docs/datamodel.html#identifierBg\">background notes</a> for more details.",
            "type": "Text"
        },
        {
            "@id": "http://schema.org/description",
            "name": "description",
            "title": "description",
            "description": "A description of the item.",
            "type": "Text"
        },
        {
            "@id": "http://schema.org/disambiguatingDescription",
            "name": "disambiguatingDescription",
            "title": "disambiguatingDescription",
            "description": "A sub property of description. A short description of the item used to disambiguate from other, similar items. Information from other properties (in particular, name) may be necessary for the description to be useful for disambiguation.",
            "type": "Text"
        },
        {
            "@id": "http://schema.org/alternateName",
            "name": "alternateName",
            "title": "alternateName",
            "description": "An alias for the item.",
            "type": "Text"
        },
        {
            "@id": "https://themost.io/schemas/id",
            "name": "id",
            "title": "ID",
            "description": "The identifier of the item.",
            "type": "Counter",
            "primary": true
        },
        {
            "@id": "https://themost.io/schemas/dateCreated",
            "name": "dateCreated",
            "title": "dateCreated",
            "description": "The date on which this item was created.",
            "type": "DateTime",
            "readonly": true,
            "value": "javascript:return new Date();"
        },
        {
            "@id": "https://themost.io/schemas/dateModified",
            "name": "dateModified",
            "title": "dateModified",
            "description": "The date on which this item was most recently modified.",
            "type": "DateTime",
            "readonly": true,
            "value": "javascript:return (new Date());",
            "calculation": "javascript:return (new Date());"
        },
        {
            "@id": "https://themost.io/schemas/createdBy",
            "name": "createdBy",
            "title": "createdBy",
            "description": "Created by user.",
            "type": "User",
            "readonly": true,
            "value": "javascript:return this.user();"
        },
        {
            "@id": "https://themost.io/schemas/modifiedBy",
            "name": "modifiedBy",
            "title": "modifiedBy",
            "description": "Last modified by user.",
            "type": "User",
            "readonly": true,
            "value": "javascript:return this.user();",
            "calculation": "javascript:return this.user();"
        }
    ]
}
```

The `fields` property is an array of fields. Each field has a name, a type, and other properties. The `name` property is the name of the field. The `type` property is the type of the field. The `value` property is the default value of the field. The `readonly` property indicates whether the field is read-only. The `primary` property indicates whether the field is a primary key. The `calculation` property is a function that is used to calculate the value of the field.

### Database schema

Each one of these fields are going to be represented as a column in the database table  e.g. `ThingBase` wher the `id` field is the primary key of the table. The `dateCreated` field is the date on which the record was created. The `dateModified` field is the date on which the record was last modified. The `createdBy` field is the user who created the record. The `modifiedBy` field is the user who last modified the record.

![ThingBase](./images/ThingBaseSchema.png)

`@themost/data` ORM will automatically create the `ThingBase` table in the database. Each data model will have a corresponding table in the database which will be used to store the data of the data model. e.g. The `Product` data model will have a corresponding `ProductBase` table in the database. The `source` attribute of the data model is used to specify the name of the database table. If you don't specify the `source` attribute, the name of the database table will be the name of the data model with the suffix `Base`.

`@themost/data`  will automatically create also a database view for each data model. The name of the database view will be the name of the data model. e.g. The `Product` data model will have a corresponding `Product` database view in the database. The `view` attribute of the data model is used to specify the name of the database view. If you don't specify the `view` attribute, the name of the database view will be the name of the data model with the suffix `Data`.

This database view will be used to query the data of the data model. It will be a join of a data model and its inherited model e.g.  the `ProductBase` table which represents `Product` with the `ThingBase` table which represents `Thing`.

![ThingBase](./images/ProductDataView.png)

```json
{
    "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
    "name": "Product",
    "version": "2.1",
    "inherits": "Thing",
    "source": "ProductBase"
}
```

Note: If you want to read more about the `Thing` data model, you can read the [schema.org](https://schema.org/Thing) documentation.

## Define attributes

Each data model has a set of attributes. Each attribute has a name and a type. The type can be a primitive type, such as `Text` or `Number`, or a reference to another data model.

