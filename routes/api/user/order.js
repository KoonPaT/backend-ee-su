'use strict'
const Ajv = require('ajv');
const AjvErrors = require('ajv-errors');
const allow_bank_account = {
    "8072": "002"
}
module.exports = async function (fastify, opts) {

    const ajv = new Ajv({ allErrors: true });
    AjvErrors(ajv);

    const schema = {
        body: {
            type: 'object',
            properties: {
                name: {
                    type: 'string'
                },
                count: {
                    type: 'string',
                },
                size: {
                    type: 'string'
                },
                address_name: {
                    type: 'string'
                },
                address_more: {
                    type: 'string'
                },
                phone_number: {
                    type: 'string'
                },
            },
            required: ['name', 'count', 'size', 'address_name', 'address_more', 'phone_number'],
            additionalProperties: false,
            errorMessage: {
                required: {
                    name: 'กรุณาใส่ชื่อผู้รับ',
                    count: 'กรุณาเลือกจำนวน',
                    size: 'กรุณาเลือกไซส์',
                    address_name: 'กรุณาใส่ที่อยู่ผู้รับ',
                    address_more: 'กรุณาใส่ที่อยู่ผู้รับ',
                    phone_number: 'กรุณาใส่เบอร์ติดต่อ'
                }
            }
        }
    };

    fastify.post('/order', {
        schema,
        validatorCompiler: ({ schema }) => {
            const validate = ajv.compile(schema)
            return validate
        }
    }, async function (request, reply) {
        var { user, type } = await request.jwtVerify();
        const sizemin = ['s', 'm', 'l', 'xl']
        let money
        if (sizemin.includes(request.body.size.toLowerCase())) {
            money = Number(request.body?.count) * 350
        } else {
            money = Number(request.body?.count) * 400
        }
        const orders = this.mongo.db.collection('order')
        try {
            const res = await orders.insertOne({
                "user": user,
                "name": request.body?.name,
                "count": request.body?.count,
                "size": request.body?.size,
                "price": money,
                "address_name": request.body?.address_name,
                "address_more": request.body?.address_more,
                "phonenumber": request.body?.phone_number,
                "paid": false,
                "qrcode": null
            })
            reply.code(201).send({
                "message": "สั่งซื้อสำเร็จ",
                "statusCode": 201,
                "id": res.insertedId
            })
        } catch (error) {
            reply.code(502).send({
                "error": "Service Unavailable",
                "message": "เซิร์ฟเวอร์ไม่พร้อมให้บริการ",
                "statusCode": 502
            })
        }
        return
    })

    fastify.get('/order/:id', async function (request, reply) {
        let { user, type } = await request.jwtVerify();
        const { id } = request.params;
        const orders = this.mongo.db.collection('order')
        const ids = new fastify.mongo.ObjectId(id);
        const order = await orders.findOne({ _id: ids, user: user });
        return order
    })

    const schema2 = {
        body: {
            type: 'object',
            properties: {
                qrcode: {
                    type: 'string'
                },
                id: {
                    type: 'string'
                },
            },
            required: ['qrcode', 'id'],
            additionalProperties: false,
            errorMessage: {
                required: {
                    qrcode: 'กรุณาใส่สลิป',
                    id: 'กรุณาใส่ไอดี',
                }
            }
        }
    };
    fastify.post('/order/upload', {
        schema: schema2,
        validatorCompiler: ({ schema: schema2 }) => {
            const validate = ajv.compile(schema2)
            return validate
        }
    }, async function (request, reply) {
        let { user, type } = await request.jwtVerify();
        let { qrcode, id } = request.body;
        // console.log('idddddddddddddddd', id)

        let response;
        try {
            response = await fastify.axios({
                method: 'post',
                maxBodyLength: Infinity,
                url: 'https://suba.rdcw.co.th/v1/inquiry',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic NWJiNzY0ZmQ2NDA3NGZlNmJlODY3ZWJmZTk1ZjFjMWQ6U0lWVGNVNTN1ZW5LSFJsWHVLUE5y'
                },
                data: JSON.stringify({
                    "payload": qrcode
                })
            })

        } catch (err) {
            console.error(err)
            return reply.code(400).send({ message: "ระบบเติมเงินมีปัญหากรุณาลองอีกครั้ง" });
        }

        let status_code = response?.data?.code;
        let data = response?.data?.data;
        // console.log(response?.data.data.receiver.account.value)

        if (status_code == 21001) {
            return reply.code(400).send({ message: "ระบบเติมเงินหมดอายุ กรุณาแจ้ง admin" });
        } else if (!status_code) {
            let money = Number(data?.amount);
            // let receiver = data?.receiver?.displayName?.toLowerCase() || data?.receiver?.name?.toLowerCase();
            let transRef = data?.transRef;
            // console.log(response?.data?.data?.receiver?.account?.value.replaceAll('-', '').slice(-4))
            if (allow_bank_account?.[response?.data?.data?.receiver?.account?.value.replaceAll('-', '').slice(-4)] !== '002') {
                // console.log(receiver)
                return reply.code(400).send({ message: "โปรดตรวจสอบชื่อบัญชีอีกครั้ง หรือติดต่อ FB : " });
            }

            const shirt_slips = fastify.mongo.db.collection('shirt_slips');
            let isHave = await shirt_slips.findOneAndUpdate({ "transref": transRef }, { $set: { id: id, last_update: new Date(), qrcode: qrcode } }, { upsert: true, returnDocument: "before", returnNewDocument: true });
            if (isHave) {
                return reply.code(400).send({ message: "สลิปใช้ไปแล้ว" });
            }
            const orders = fastify.mongo.db.collection('order');
            const idss = new fastify.mongo.ObjectId(id);
            const ordermini = await orders.findOne({ _id: idss });
            // console.log('idsssssssssssssssssss', idss)
            // console.log(money, ordermini);
            if (money == ordermini.price) {
                const order = await orders.updateOne({ _id: idss }, { $set: { last_update: new Date(), paid: true } });
                return reply.code(200).send({
                    "message": "อัพโหลดสลิปเรียบร้อย",
                    "statusCode": 200
                })
            } else {
                return reply.code(400).send({ message: "ยอดเงินไม่ถูกต้อง กรุณาติดต่อ FB :", "statusCode": 400 });
            }
        }
    })
}
