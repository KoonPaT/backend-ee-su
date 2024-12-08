'use strict'

module.exports = async function (fastify, opts) {
    fastify.post('/logout', async function (request, reply) {
        try {
            let { username } = await request.jwtVerify();
            reply.send({ status: "ok" })
            return
        } catch (error) {
            reply.code(400).send({
                "error": "Bad Request",
                "message": error,
                "statusCode": 400
            })
            return
        }
    })
}
