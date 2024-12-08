'use strict'

const fp = require('fastify-plugin')

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
module.exports = fp(async function (fastify, opts) {
    fastify.register(require('@fastify/jwt'), {
        secret: '33bf0219cd063cc4006f931d13a727c41989f33ecdeb99a84284f5d5356269a9855dd320e04fe7b1da5f6dbfa5f934ed27759821a90cae671bb67bbcee4f76aaeaff7d97429273caa6a36c6f1db3e54664bf01c347b310ea55360364e3c9729737aa99ecb21652c8b9b88b81c6fb5d00a2f43eebbadfc66d56bf6d3424b1e3a10114837ee281ac5b5c5056b84efc97a106b4b16c26edd1ac98df41889d39106154bbecadb30db1eaf5bfa22fef316e3f0f8ab999b7bbdbb6db9df589911ed00373170bb961a310ec30ca62a059d4a6e151496b31e7941f65860b1f6d64a1a7d54e6e3aadca9b8884823ea4197d1cbc92982ec14955dcc04e5e291c6c0e73582112c722f71d6a182dcab9df797b1a018bea5a48227631a46f85746979e3360bcd2910c784cb542bc4adc31bfea836fa84054df447b9bc04bd7f0b5b9495e04db2'
    })
})
