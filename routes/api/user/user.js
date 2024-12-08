'use strict'
const Ajv = require('ajv');
const AjvErrors = require('ajv-errors');

module.exports = async function (fastify, opts) {
    fastify.get('/getnumber', async function (request, reply) {
        let { user, type } = await request.jwtVerify();
        const users = fastify.mongo.db.collection('users')
        const id = new fastify.mongo.ObjectId(user);
        const user2 = await users.findOne({ _id: id })
        return { phone_number: user2.phone_number }
    })
}
