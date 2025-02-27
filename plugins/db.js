'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function (fastify, opts) {
    fastify.register(require('@fastify/mongodb'), {
        // force to close the mongodb connection when app stopped
        // the default value is false
        forceClose: true,

        url: 'mongodb://127.0.0.1:27017/ecs'
    })
})
