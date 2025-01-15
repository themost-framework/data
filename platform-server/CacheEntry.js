/* eslint-disable quotes */
const CacheEntrySchema = {
    "$schema": "https://themost-framework.github.io/themost/models/2018/2/schema.json",
    "name": "CacheEntry",
    "version": "2.0.0",
    "abstract": false,
    "hidden": true,
    "caching": "none",
    "fields": [
        {
            "name": "id",
            "description": "A unique identifier for the current cache entry.",
            "type": "Guid",
            "nullable": true,
            "readonly": false,
            "editable": true,
            "size": 36,
            "primary": true
        },
        {
            "name": "path",
            "description": "A string that represents the path of the current cache entry.",
            "type": "Text",
            "nullable": false,
            "readonly": false,
            "editable": true,
            "size": 1024,
            "indexed": true
        },
        {
            "name": "headers",
            "description": "A key-value pair string that represents the request headers being passed by the process.",
            "type": "Text",
            "nullable": true,
            "readonly": false,
            "editable": true,
            "size": 1024
        },
        {
            "name": "doomed",
            "description": "A boolean value that indicates whether the current cache entry is doomed.",
            "type": "Boolean",
            "nullable": true,
            "readonly": false,
            "editable": true,
            "indexed": true
        },
        {
            "name": "contentEncoding",
            "description": "A string that represents the content encoding of the current cache entry.",
            "type": "Text",
            "nullable": false,
            "readonly": false,
            "editable": true
        },
        {
            "name": "location",
            "type": "Text",
            "nullable": false,
            "readonly": false,
            "editable": true,
            "size": 24
        },
        {
            "name": "params",
            "description": "A string that represents the route parameters being passed by the process.",
            "type": "Text",
            "nullable": true,
            "readonly": false,
            "editable": true,
            "size": 1024
        },
        {
            "name": "customParams",
            "description": "A string that represents the custom parameters being passed by the process.",
            "type": "Text",
            "nullable": true,
            "readonly": false,
            "editable": true,
            "size": 1024
        },
        {
            "name": "duration",
            "description": "An integer that represents the absolute duration of the current cache entry.",
            "type": "Integer",
            "readonly": false,
            "editable": false
        },
        {
            "name": "createdAt",
            "description": "A date that represents the creation date of the current cache entry.",
            "type": "DateTime",
            "nullable": false,
            "readonly": false,
            "editable": false
        },
        {
            "name": "expiredAt",
            "description": "A date that represents the expiration date of the current cache entry.",
            "type": "DateTime",
            "readonly": false,
            "editable": true
        },
        {
            "name": "modifiedAt",
            "description": "A date that represents the last modification date of the current cache entry.",
            "readonly": false,
            "editable": true
        },
        {
            "name": "entityTag",
            "description": "A string that represents the generated entity tag of the current cache entry.",
            "type": "Text",
            "readonly": false,
            "editable": true
        },
        {
            "name": "content",
            "description": "A string that represents the content of the current cache entry.",
            "type": "Json"
        }
    ],
    "constraints": [
        {
            "type": "unique",
            "fields": [
                "path",
                "location",
                "contentEncoding",
                "headers",
                "params",
                "customParams"
            ]
        }
    ],
    "privileges": [
        {
            "mask": 15,
            "type": "global"
        },
        {
            "mask": 15,
            "type": "global",
            "account": "Administrators"
        }
    ]
}

module.exports = {
    CacheEntrySchema
};