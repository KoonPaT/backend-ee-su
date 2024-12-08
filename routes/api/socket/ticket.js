'use strict'
const Ajv = require('ajv');
const AjvErrors = require('ajv-errors');
const rollbackin_ms = 1020000;
const { instrument } = require("@socket.io/admin-ui");

// const allow_receiver = [
//     "จิดาภา เลาหสถิตย์",
//     "นางสาว จิดาภา เลาหสถิตย์",
//     "น.ส. จิดาภา เ",
// ];
const allow_bank_account = {
    "8072": "002"
}

const new_student = 1760
const old_student = 4800

module.exports = async function (fastify, opts) {
    let q = false;
    const ioticket = fastify.io;//.of("/socket/ticket");

    instrument(fastify.io, {
        serverId: `${require("os").hostname()}#${process.pid}`,
        auth: {
            type: "basic",
            username: "admin",
            password: "$2a$08$Qoi.m.z1rdVNRRsIRLHZy.TT4P5ymAr9EKHvsJARefJxikOp9LbyC" // "changeit" encrypted with bcrypt
        },
    });

    const ajv = new Ajv({ allErrors: true });
    AjvErrors(ajv);

    const schema = {
        body: {
            type: 'object',
            properties: {
                qrcode: {
                    type: 'string'
                },
            },
            required: ['qrcode'],
            additionalProperties: false,
            errorMessage: {
                required: {
                    email: 'กรุณาใส่สลิป',
                }
            }
        }
    };


    setInterval(async () => {
        if (q) { return }
        q = true;
        const tables = fastify.mongo.db.collection('table')
        const table = await tables.find({ status: 1, ex_claim_date_time: { $lte: new Date() } }).toArray();
        for (const iterator of table) {
            let value = await tables.findOneAndUpdate({
                id: iterator.id,  //{ $eq: null },
                status: 1,
            }, {
                $set: {
                    claim: null,
                    status: 0,
                    ex_claim_date_time: null
                }
            }, { upsert: false, returnDocument: "after" });
            if (value) {
                ioticket.emit("table_update", {
                    _id: value._id,
                    id: value.id,
                    status: value.status,
                    claim: value.claim,
                    ex_claim_date_time: value.ex_claim_date_time
                })
            }
        }
        q = false;
    }, 1000);

    ioticket.on("connection", (socket) => {
        let handshake = socket.handshake;
        try {
            var decodedToken = fastify.jwt.decode(handshake.auth?.token?.split(" ")[1]);
            socket.join("room1");
        } catch (error) {
            socket.disconnect();
            return
        }

        socket.on("table_list", async (data) => {
            const tables = fastify.mongo.db.collection('table')
            const table = await tables.find({}).toArray();
            socket.emit("table_list", {
                data: table
            })
        });

        socket.on("table_click", async (data) => {
            const tables = fastify.mongo.db.collection('table')
            const id = new fastify.mongo.ObjectId(data.id);
            let ex_claim_date_time = new Date(Date.now() + rollbackin_ms)
            let value = await tables.findOneAndUpdate({
                _id: id,
                claim: { $eq: null },
                status: 0,
            }, {
                $set: {
                    claim: decodedToken.user,
                    status: 1,
                    ex_claim_date_time: ex_claim_date_time
                }
            }, { upsert: false, returnDocument: "after" });

            if (value) {
                socket.emit("noti", {
                    "status": "success",
                    "message": `จองหมายเลข ${value.id + 1} สําเร็จ`
                })
                ioticket.emit("table_update", {
                    _id: value._id,
                    id: value.id,
                    status: value.status,
                    claim: value.claim,
                    ex_claim_date_time: value.ex_claim_date_time
                })
            } else {
                socket.emit("noti", {
                    "status": "fail",
                    "message": "ไม่สามารถจองได้",
                })
            }
        });

        socket.on("table_mouseover", (data) => {
            socket.broadcast.emit("table_mouseover", data)
        })

        socket.on("table_mouseout", (data) => {
            socket.broadcast.emit("table_mouseout", data)
        })

        socket.on("table_unclick", async (data) => {
            const tables = fastify.mongo.db.collection('table')
            const id = new fastify.mongo.ObjectId(data.id);
            let value = await tables.findOneAndUpdate({
                _id: id,
                claim: decodedToken.user,  //{ $eq: null },
                status: 1,
            }, {
                $set: {
                    claim: null,
                    status: 0,
                    ex_claim_date_time: null
                }
            }, { upsert: false, returnDocument: "after" });

            if (value) {
                socket.emit("noti", {
                    "status": "success",
                    "message": `ยกเลิกการจองหมายเลข ${value.id + 1}`
                })
                ioticket.emit("table_update", {
                    _id: value._id,
                    id: value.id,
                    status: value.status,
                    claim: value.claim,
                    ex_claim_date_time: value.ex_claim_date_time
                })
            } else {
                socket.emit("noti", {
                    "status": "fail",
                    "message": "ไม่สามารถจองได้",
                })
            }
        });
    });


    fastify.post('/ticket/upload', {
        schema,
        validatorCompiler: ({ schema }) => {
            const validate = ajv.compile(schema)
            return validate
        }
    }, async function (request, reply) {
        let { user, type } = await request.jwtVerify();
        let { qrcode } = request.body;
        if (!qrcode) {
            return reply.code(400).send({ message: 'รูปแบบรหัส QRCODE ไม่ถูกต้อง' });
        };

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

            // if (!allow_receiver.find(element => receiver.includes(element))) {
            //     console.log(receiver)
            //     return reply.code(400).send({ message: "โปรดตรวจสอบชื่อบัญชีอีกครั้ง หรือติดต่อ FB :" });
            // }
            // console.log(response?.data?.data?.receiver?.account?.value.replaceAll('-', '').slice(-4))
            if (allow_bank_account?.[response?.data?.data?.receiver?.account?.value.replaceAll('-', '').slice(-4)] !== '002') {
                // console.log(receiver)
                return reply.code(400).send({ message: "โปรดตรวจสอบชื่อบัญชีอีกครั้ง หรือติดต่อ FB :" });
            }

            const slips = fastify.mongo.db.collection('slips');
            let isHave = await slips.findOneAndUpdate({ "transref": transRef }, { $set: { username: user, type: type, last_update: new Date(), amount: money, qrcode: qrcode } }, { upsert: true, returnDocument: "before", returnNewDocument: true });
            if (isHave) {
                return reply.code(400).send({ message: "สลิปใช้ไปแล้ว" });
            }
            const tables = fastify.mongo.db.collection('table');
            let new_date = new Date()
            const table = await tables.find({ status: 1, ex_claim_date_time: { $gte: new_date }, claim: user }).toArray();
            let princes;
            if (type == 'old') {
                princes = table.length * old_student
            } else {
                princes = table.length * new_student
            }
            if (money == princes) {
                for (const iterator of table) {
                    let value = await tables.findOneAndUpdate({
                        id: iterator.id,
                        status: 1,
                        ex_claim_date_time: { $gte: new_date },
                        claim: user
                    }, {
                        $set: { status: 2 }
                    }, { upsert: false, returnDocument: "after" });
                    if (value) {
                        ioticket.emit("table_update", {
                            _id: value._id,
                            id: value.id,
                            status: value.status,
                            claim: value.claim,
                            ex_claim_date_time: value.ex_claim_date_time
                        })
                    }
                }
                return reply.code(200).send({ message: "จองสำเร็จ" });

            } else {
                // console.log(money, princes);
                return reply.code(400).send({ message: "ยอดเงินไม่ถูกต้อง กรุณาติดต่อ FB :" });
            }

        }




        // const slips = fastify.mongo.db.collection('slips');
        // if (true) {
        //     const tables = fastify.mongo.db.collection('table')
        //     const table = await tables.find({ status: 1, ex_claim_date_time: { $gte: new Date() }, claim: user }).toArray();
        //     for (const iterator of table) {
        //         let value = await tables.findOneAndUpdate({
        //             id: iterator.id,
        //             status: 1,
        //             ex_claim_date_time: { $gte: new Date() },
        //             claim: user
        //         }, {
        //             $set: { status: 2 }
        //         }, { upsert: false, returnDocument: "after" });
        //         if (value) {
        //             // console.log(value)
        //             ioticket.emit("table_update", {
        //                 _id: value._id,
        //                 id: value.id,
        //                 status: value.status,
        //                 claim: value.claim,
        //                 ex_claim_date_time: value.ex_claim_date_time
        //             })
        //         }
        //     }
        //     // let isHave = await slips.findOneAndUpdate({ "transref": qrcode }, { $set: { username: user, type: type, last_update: new Date(), amount: money, qrcode: qrcode } }, { upsert: true, returnDocument: "after" });
        //     // if (isHave.lastErrorObject.updatedExisting) {
        //     //     return reply.code(400).send({ message: "สลิปใช้ไปแล้ว" });
        //     // }
        // }





        // console.log({ user, type, body: request.body })
        // return { user, type, body: request.body }
    })
}