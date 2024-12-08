'use strict'

const fp = require('fastify-plugin')

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

module.exports = fp(async function (fastify, opts) {
  fastify.register(require('@fastify/cors'), (instance) => {
    return (req, callback) => {
      const corsOptions = {
        // credentials: true,
        origin: true
      };
      if (/^localhost$/m.test(req.headers.origin)) {
        corsOptions.origin = false
        // corsOptions.credentials = false
      }
      callback(null, corsOptions)
    }
  })
})
