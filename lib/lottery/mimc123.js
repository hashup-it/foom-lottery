#!/usr/bin/node

const assert = require("assert");
const circomlibjs = require("circomlibjs");
const { bigintToHex, leBufferToBigint, } = require("./utils/bigint.js");

async function main() {
  //const L =    0x297903d890dc835c31b3813f8ce8171486ff31fcca338de023a633aecdf852c2n ; // 1n;
  const L =    0x0ff25e47ccd9f9f110f0db747d5033dccf719e699581015551b50f507c10d82an ; // 1n;
  const mask = 0x0000000000000000000000000000000000000000000000000000000007ffffffn ;
  const rand =     0xea6558b3c8163cf3723711402b5f45073938add8e7b7f1c6a4c4a635dc64n ;
  const R = 0n;
  const k = 0n;
  const mimcsponge = await circomlibjs.buildMimcSponge();
//const pedersen = await circomlibjs.buildPedersenHash();

  console.log("L",L);
  console.log("R",R);
  console.log("k",k);
  const m1 = await mimcsponge.hash(L,R,k);
//console.log(mimcsponge.F.toString(m1.xL, 16));
//console.log(mimcsponge.F.toString(m1.xR, 16));
//console.log(mimcsponge.F.toHex(m1.xR));
  const L1 = leBufferToBigint(mimcsponge.F.fromMontgomery(m1.xL));
  const R1 = leBufferToBigint(mimcsponge.F.fromMontgomery(m1.xR));
  console.log(bigintToHex(leBufferToBigint(mimcsponge.F.fromMontgomery(m1.xL))));
  console.log(bigintToHex(leBufferToBigint(mimcsponge.F.fromMontgomery(m1.xR))));
  console.log("");
  const L2in = leBufferToBigint(mimcsponge.F.fromMontgomery(mimcsponge.F.add(mimcsponge.F.e(L1),mimcsponge.F.e(mask))));
  console.log(bigintToHex(L2in),"L2in");
  const m2 = await mimcsponge.hash(L2in,R1,k);
  const L2 = leBufferToBigint(mimcsponge.F.fromMontgomery(m2.xL));
  const R2 = leBufferToBigint(mimcsponge.F.fromMontgomery(m2.xR));
  console.log(bigintToHex(leBufferToBigint(mimcsponge.F.fromMontgomery(m2.xL))));
  console.log(bigintToHex(leBufferToBigint(mimcsponge.F.fromMontgomery(m2.xR))));
  console.log("");
//console.log(bigintToHex(leBufferToBigint(pedersen.babyJub.F.fromMontgomery(m1.xR))));

//console.log(mimcsponge.F.e(m1.xL));
//console.log(mimcsponge.F.e(m1.xR));
  //console.log(bigintToHex(mimcsponge.F.e(m1.xL)));
  //console.log(bigintToHex(mimcsponge.F.e(m1.xR)));

//console.log(bigintToHex(m1.xL));
//console.log(bigintToHex(m1.xR));
//console.log(bigintToHex(leBufferToBigint(m1.xL)));
//console.log(bigintToHex(leBufferToBigint(m1.xR)));
  //const ar = mimcsponge.getConstants();
  //console.log(":",ar[219]);

  console.log("");
  console.log(bigintToHex(L),"L");
  console.log(bigintToHex(mask),"mask");
  console.log(bigintToHex(rand),"rand");
  const mimcspongeOut = leBufferToBigint(mimcsponge.F.fromMontgomery(mimcsponge.multiHash([L, mask, rand])));
  console.log(bigintToHex(mimcspongeOut));
  console.log("0x2fa4d86e483d198c8749a51db64189306e9ca19374bef62af2320d8b0d15d0aa");

//const res2 = mimcsponge.multiHash([1,2]);
  //console.log(mimcsponge.F.toString(res2,16));
  //console.log(mimcsponge.F.toString(mimcsponge.F.e("0x2bcea035a1251603f1ceaf73cd4ae89427c47075bb8e3a944039ff1e3d6d2a6f"),16));
//assert(mimcsponge.F.eq(mimcsponge.F.e("0x2bcea035a1251603f1ceaf73cd4ae89427c47075bb8e3a944039ff1e3d6d2a6f"), res2));
}

main()
  .then((wtns) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

/*
Logs:

  0xff25e47ccd9f9f110f0db747d5033dccf719e699581015551b50f507c10d82a commmitment

  0xd187f744b8311b44b9a9e6dc37579038d11ba528b32e6739c6aaa171ff83e3 secret

  0xff25e47ccd9f9f110f0db747d5033dccf719e699581015551b50f507c10d82a R1in C
  0x15f958c42d1a7f9432bed9d5e82db4c3b819d578f8ade33f268dbd595d363c2d R1 C
  0x1c5e4e765f6ef5920ecbfc2b0c249a9fbcd5b1479f4316c8964e93d61960b812 C1 C
  0x7ffffff mask C
  0x15f958c42d1a7f9432bed9d5e82db4c3b819d578f8ade33f268dbd5965363c2c R2in C
  0x25c2435f8a57020fe4de219c9fe80748580f1a6642e5ab251d4bc85a1f281c13 R2 C
  0x29ab159417890d20abc92f493628ea7239fcbdcb11b8fb2a7e144024ac21ad34 C2 C
  0x25c2435f8a57020fe4de219c9fe80748580f1a6642e5ab251d4bc85a1f281c13 R Cr
  0x29ab159417890d20abc92f493628ea7239fcbdcb11b8fb2a7e144024ac21ad34 C Cr
  0xea6558b3c8163cf3723711402b5f45073938add8e7b7f1c6a4c4a635dc64 rand Cr
  0x25c32dc4e30aca2621d193d3b12832a79d16539ef0be92dd0f126d1ec55df877 R Cr
  0x2fa4d86e483d198c8749a51db64189306e9ca19374bef62af2320d8b0d15d0aa R Cr
  0x1bf7b6fe7a3314cc19d9a4bf7e1bb9c3cbe5ca4612585e846296579792daa482 C Cr


  0x297903d890dc835c31b3813f8ce8171486ff31fcca338de023a633aecdf852c2 R1in C
  0x17a7bfad7247788cc459ad6f83f5e6810c615827288e9f481e2bc8b89c57ea8 R1 C
  0x2ddfcf5b52acb7dc9675a0bc99aa1c909c121f117006ed8124b3b7298f5bcba1 C1 C

  0x2ddfcf5b52acb7dc9675a0bc99aa1c909c121f117006ed8124b3b7298f5bcba1 mask C
  0x17a7bfad7247788cc459ad6f83f5e6810c615827288e9f481e2bc8b91c57ea7 R2in C
  0x2c3e7be7a04a9d4e2eaad92dd388b8ac4dfeedde45a88774ea43b9e2dc2bf4a7 R2 C
  0x14ab6d1062f1f31fab300fea466d5d2e078bff249112ad5c3be04d16ca206df0 C2 C
  0x2c3e7be7a04a9d4e2eaad92dd388b8ac4dfeedde45a88774ea43b9e2dc2bf4a7 R Cr
  0x14ab6d1062f1f31fab300fea466d5d2e078bff249112ad5c3be04d16ca206df0 C Cr
  0xea6558b3c8163cf3723711402b5f45073938add8e7b7f1c6a4c4a635dc64 rand Cr
  0x2c3f664cf8fe65646b9e4b64e4c8e40b93062716f3816f2cdc0a5ea78261d10b R Cr
  0x161fc50847ed7da5b2d939b1627b6854dc228a93d5329a6602159923caf24 R Cr
  0x1007d0c8a153dad47fddb2c857c57eea7108cbb26483bd7c46e071389d810b76 C Cr
*/
