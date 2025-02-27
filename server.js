'use strict'

// Read the .env file.
require('dotenv').config()

// Require the framework
const Fastify = require('fastify')

// Require library to exit fastify process, gracefully (if possible)
const closeWithGrace = require('close-with-grace')

// Instantiate Fastify with some config
const app = Fastify({
    // exposeHeadRoutes: true,
    logger: false,
    disableRequestLogging: true,
    trustProxy: true,
    forceCloseConnections: true,
    connectionTimeout: 30000,
    requestTimeout: 30000,
})

// Register your application as a normal plugin.
const appService = require('./app.js')
app.register(appService)

// delay is the number of milliseconds for the graceful close to finish
const closeListeners = closeWithGrace({ delay: process.env.FASTIFY_CLOSE_GRACE_DELAY || 500 }, async function ({ signal, err, manual }) {
    if (err) {
        app.log.error(err)
    }
    await app.close()
})

app.addHook('onClose', (instance, done) => {
    closeListeners.uninstall()
    done()
})

// Start listening.
app.listen({ port: process.env.PORT || 3000 }, (err) => {
    console.log(`SERVER START AT PORT: ${process.env.PORT || 3000}`)
    if (err) {
        app.log.error(err)
        process.exit(1)
    }
})