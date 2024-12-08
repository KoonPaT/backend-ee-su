'use strict'
const Ajv = require('ajv');
const AjvErrors = require('ajv-errors');
const validator = require('validator');

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
        phone_number: {
          type: 'string'
        },
        password: {
          type: 'string'
        },
        confirm_password: {
          type: 'string'
        },
        type: {
          type: 'string'
        },
      },
      required: ['email', 'phone_number', 'password', 'confirm_password'],
      additionalProperties: false,
      errorMessage: {
        required: {
          email: 'กรุณาใส่อีเมล',
          phone_number: 'กรุณาใส่หมายเลขโทรศัพท์',
          password: 'กรุณาใส่รหัสผ่าน',
          type: 'กรุณาเลือกว่าคุณเป็น นักศึกษาปัจจุบัน หรือ ศิษย์เก่า',
          confirm_password: 'กรุณายืนยันรหัสผ่าน'
        }
      }
    }
  };

  fastify.post('/register', {
    schema,
    validatorCompiler: ({ schema }) => {
      const validate = ajv.compile(schema)
      return validate
    }
  }, async function (request, reply) {
    if (!validator.isEmail(request.body?.email)) {
      reply.status(400).send({
        "statusCode": 400,
        "code": "ERR_VALIDATION",
        "error": "Bad Request",
        "message": "รูปแบบอีเมลไม่ถูกต้อง"
      })
      return
    } else if (!validator.isMobilePhone(request.body?.phone_number, "th-TH")) {
      reply.status(400).send({
        "statusCode": 400,
        "code": "ERR_VALIDATION",
        "error": "Bad Request",
        "message": "รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง"
      })
      return
    } else if (!['new','old'].includes(request.body?.type)) {
      reply.status(400).send({
        "statusCode": 400,
        "code": "ERR_VALIDATION",
        "error": "Bad Request",
        "message": "กรุณาเลือกว่าคุณเป็น นักศึกษาปัจจุบัน หรือ ศิษย์เก่า"
      })
      return
    }  else if (!validator.equals(request.body?.password, request.body?.confirm_password)) {
      reply.status(400).send({
        "statusCode": 400,
        "code": "ERR_VALIDATION",
        "error": "Bad Request",
        "message": "รหัสผ่านที่ยืนยันไม่ตรงกัน"
      })
      return
    } else if (!validator.isLength(request.body?.confirm_password, { min: 8, max: 32 })) {
      reply.status(400).send({
        "statusCode": 400,
        "code": "ERR_VALIDATION",
        "error": "Bad Request",
        "message": "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร และไม่เกิน 32 ตัวอักษร"
      })
      return
    }
    const users = this.mongo.db.collection('users');
    var user = await users.findOne({ "email": request.body?.email });
    if (!user) {
      try {
        let res = await users.insertOne({
          "email": request.body?.email,
          "phone_number": request.body?.phone_number,
          "password": await fastify.bcrypt.hash(request.body?.confirm_password),
          "type": request.body?.type
        })
        reply.code(201).send({
          "message": "ลงทะเบียนสำเร็จ",
          "statusCode": 201,
          "res": res.insertedId
        })
      } catch (error) {
        reply.code(502).send({
          "error": "Service Unavailable",
          "message": "เซิร์ฟเวอร์ไม่พร้อมให้บริการ",
          "statusCode": 502
        })
      }
      return
    } else {
      reply.code(406).send({
        "error": "Not Acceptable",
        "message": "มีชื่อผู้ใช้อยู่ในฐานข้อมูลอยู่แล้ว",
        "statusCode": 406
      })
      return
    }
  });

}
