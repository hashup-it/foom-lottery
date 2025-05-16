import * as circomlibjs from 'circomlibjs'
import { leBufferToBigint } from './bigint.js'

export async function mimcsponge2(in1, in2) {
  const mimcsponge = await circomlibjs.buildMimcSponge()
  const result = mimcsponge.multiHash([in1, in2])
  return leBufferToBigint(mimcsponge.F.fromMontgomery(result))
}

export async function mimcsponge3(in1, in2, in3) {
  const mimcsponge = await circomlibjs.buildMimcSponge()
  const result = mimcsponge.multiHash([in1, in2, in3])
  return leBufferToBigint(mimcsponge.F.fromMontgomery(result))
}

export async function mimcspongehash(inL, inR, k) {
  const mimcsponge = await circomlibjs.buildMimcSponge()
  const out = mimcsponge.hash(inL, inR, k)
  return {
    xL: leBufferToBigint(mimcsponge.F.fromMontgomery(out.xL)),
    xR: leBufferToBigint(mimcsponge.F.fromMontgomery(out.xR)),
  }
}

export async function mimcRC(in1, in2) {
  const mimcsponge = await circomlibjs.buildMimcSponge()
  const out1 = mimcsponge.hash(in1, 0n, 0n)

  const in2L = leBufferToBigint(
    mimcsponge.F.fromMontgomery(mimcsponge.F.add(out1.xL, mimcsponge.F.e(in2)))
  )
  const in2R = leBufferToBigint(mimcsponge.F.fromMontgomery(out1.xR))

  const out2 = mimcsponge.hash(in2L, in2R, 0n)

  return {
    R: leBufferToBigint(mimcsponge.F.fromMontgomery(out2.xL)),
    C: leBufferToBigint(mimcsponge.F.fromMontgomery(out2.xR)),
  }
}
