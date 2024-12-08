'use strict'
const Ajv = require('ajv');
const AjvErrors = require('ajv-errors');

module.exports = async function (fastify, opts) {

    const ajv = new Ajv({ allErrors: true });
    AjvErrors(ajv);

    const schema = {
        body: {
            type: 'object',
            properties: {
                email: {
                    type: 'string'
                },
                password: {
                    type: 'string'
                },
            },
            required: ['email', 'password'],
            additionalProperties: false,
            errorMessage: {
                required: {
                    email: 'กรุณาใส่อีเมล',
                    password: 'กรุณาใส่รหัสผ่าน'
                }
            }
        }
    };

    fastify.get('/user', async function (request, reply) {
        var { user, type } = await request.jwtVerify();
        return { user: user, type: type }
    })

    fastify.post('/login', {
        schema,
        validatorCompiler: ({ schema }) => {
            const validate = ajv.compile(schema)
            return validate
        }
    }, async function (request, reply) {
        const users = this.mongo.db.collection('users')
        const user = await users.findOne({ "email": request.body?.email });
        if (user) {
            let boolpass = await fastify.bcrypt.compare(request.body?.password, user.password)
            if (boolpass) {
                const token = fastify.jwt.sign({ user: user._id, type: user.type });
                reply.code(202).send({
                    "token": token,
                    "type": user.type,
                    "message": "ล็อกอินสำเร็จ",
                    "statusCode": 202
                })
            } else {
                reply.code(401).send({
                    "error": "Unauthorized",
                    "message": "รหัสผ่านไม่ถูกต้อง",
                    "statusCode": 401
                })
            }
            return
        } else {
            reply.code(401).send({
                "error": "Unauthorized",
                "message": "ไม่พบชื่อผู้ใช้ในฐานข้อมูล",
                "statusCode": 401
            })
        }
        return
    })
}
