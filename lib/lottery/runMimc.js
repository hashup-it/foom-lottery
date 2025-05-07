const circomlibjs = require("circomlibjs");
const { ethers } = require("ethers");
const { rbigint, bigintToHex, leBigintToBuffer, leBufferToBigint } = require("./utils/bigint.js");

// Intended output: (bytes32 commitment, bytes32 nullifier, bytes32 secret)

////////////////////////////// MAIN ///////////////////////////////////////////

async function main() {
  const pedersen = await circomlibjs.buildPedersenHash();
  const mimcsponge = await circomlibjs.buildMimcSponge();
  const mimcspongeMultiHash = (left, right) => leBufferToBigint( pedersen.babyJub.F.fromMontgomery(mimcsponge.multiHash([left, right])));

  // 1. Generate random input
  left = rbigint(31);
  right = rbigint(31);

  // 2. Get hash
  for(var i=0;i<1024000;i++){
  	next = await mimcspongeMultiHash(left, right);
        left = right;
        right = next;
        res = ethers.AbiCoder.defaultAbiCoder().encode( ["bytes32"], [bigintToHex(next)]);
    	process.stdout.write(res+"\n");
  }

  // 3. Return abi encoded nullifier, secret, commitment
  //const res = ethers.AbiCoder.defaultAbiCoder().encode( ["bytes32", "bytes32", "bytes32"], [bigintToHex(commitment), bigintToHex(left), bigintToHex(right)]);
  return;
}

main()
  .then((res) => {
    //process.stdout.write("\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
