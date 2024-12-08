'use strict'

const fp = require('fastify-plugin')

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

module.exports = fp(async function (fastify, opts) {
  fastify.register(require("fastify-socket.io"), {
    // put your options here
    // path: "/socket.io/",
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000", "https://admin.socket.io", "https://ee-homecoming.com"],
      credentials: true,
      withCredentials: true
    }
  })
})