const path = require('path')
const snarkjs = require('snarkjs')

const { hexToBigint } = require('./utils/bigint.js')

// node generateCancelProof.js <R> <C> <recipient> <relayer> <fee> <refund> <mask>

async function main() {
const inputs = process.argv.slice(2)
  const [Rstr, Cstr, recipientStr, relayerStr, feeStr, refundStr, maskStr] = inputs.map(BigInt);

  const input = {
    R: hexToBigint(Rstr),
    C: hexToBigint(Cstr),
    recipient: BigInt(recipientStr),
    relayer: BigInt(relayerStr),
    fee: BigInt(feeStr),
    refund: BigInt(refundStr),
    mask: BigInt(maskStr),
  }

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    path.join(__dirname, './circuit_artifacts/cancelbet_js/cancelbet.wasm'),
    path.join(__dirname, './circuit_artifacts/cancelbet_final.zkey')
  )

  const pA = proof.pi_a.slice(0, 2).map(BigInt)
  const pB = [
    [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
    [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
  ]
  const pC = proof.pi_c.slice(0, 2).map(BigInt)

  const formatted = {
    pA,
    pB,
    pC,
    R: input.R,
    C: input.C,
    recipient: input.recipient,
    relayer: input.relayer,
    fee: input.fee,
    refund: input.refund,
    mask: input.mask,
  }

  console.log(JSON.stringify(formatted, null, 2))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
