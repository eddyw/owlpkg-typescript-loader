var commonSchema = {
    tslint: {
        type: 'string',
    },
    tslintFormatter: {
        type: 'string',
    },
    getCustomTransformers: {
        instanceof: 'Function',
    },
    cache: {
        anyOf: [
            {
                type: 'boolean',
            },
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    cacheKey: {
                        instanceof: 'Function',
                    },
                    cacheIdentifier: {
                        type: 'string',
                    },
                    cacheDirectory: {
                        type: 'string',
                    },
                    read: {
                        instanceof: 'Function',
                    },
                    write: {
                        instanceof: 'Function',
                    },
                },
            },
        ],
    },
};
var jsSchema = {
    type: 'object',
    additionalProperties: false,
    properties: Object.assign({
        jsconfig: {
            type: 'string',
        },
    }, commonSchema),
};
var tsSchema = {
    type: 'object',
    additionalProperties: false,
    properties: Object.assign({
        tsconfig: {
            type: 'string',
        },
    }, commonSchema),
};
var schema = {
    anyOf: [
        jsSchema,
        tsSchema,
    ],
};
module.exports = schema;
