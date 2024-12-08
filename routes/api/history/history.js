'use strict'


module.exports = async function (fastify, opts) {
    fastify.get('/get', async function (request, reply) {
        var { user, type } = await request.jwtVerify();

        const tables = fastify.mongo.db.collection('table')
        const table = await tables.find({ claim: user, status: 2 }).toArray();
        // console.log(table)


        return { table: table, user: user, type: type }
    })

    fastify.get('/getshirt', async function (request, reply) {
        var { user, type } = await request.jwtVerify();

        const orders = fastify.mongo.db.collection('order')
        const table = await orders.find({ user: user }).toArray();

        return { table: table, user: user }
    })
}
