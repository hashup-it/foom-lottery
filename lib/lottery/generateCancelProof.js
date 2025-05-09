import path from "path";
import { groth16 } from "snarkjs";
import { hexToBigint } from "./utils/bigint.js";

// node generateCancelProof.js <R> <C> <recipient> <relayer> <fee> <refund> <mask>

export async function generateCancelProof(inputs) {
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

  const { proof, publicSignals } = await groth16.fullProve(
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

  return {
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
  };
}

if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
    const inputs = process.argv.slice(2);
    generateCancelProof(inputs)
      .then((res) => {
        console.log(JSON.stringify(res, null, 2));
        process.exit(0);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
