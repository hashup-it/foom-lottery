const circomlibjs = require("circomlibjs");
const { MerkleTree } = require("fixed-merkle-tree");

const { leBufferToBigint, hexToBigint } = require("./bigint.js");

// Constants from MerkleTreeWithHistory.sol
const MERKLE_TREE_HEIGHT = 32;

// This matches the zeros function in MerkleTreeWithHistory.sol
const ZERO_VALUES = [
"0x16d18e1425b426e92d3d897958aabf099087b2401bfed53290f5a81fe73c69a5",// 0:mimcsponge(keccak256("foom"),0)
"0x1d7a97c61116e168288d66d413fe2125c2ab9c92d121953c647f13ec10033fc0",// 1
"0x17b63b2b4ac17b6e44ca1d2004d39ccfdb1b3393ebbdb72104ede26d921e4ce1",// 2
"0x0ba52b00a0b2e2e061adfdb675c4f8d71a399145db50d35f33e510e744f73707",// 3
"0x2e38f22ac74d9215b0040d6202f507d6644158a80a959d07bbc8f302c7ddaea1",// 4
"0x115dc3f113f746d413e61f6d08de9d3e297d2fe81c238e2769d7ff2fc1d22c5d",// 5
"0x1e23fee872de60a7c358415127a67ccf5cc4d000c0a122caf6eff7569daffd4e",// 6
"0x16817edb094ca1bb21a32712b164b053cc8eac495050a90a95072e6626a05f6b",// 7
"0x201b0769fc89a55f820748719da0ebdbbcaac2e4fe1c4ffa393e12a0d6dbeb97",// 8
"0x07325bddc8d00119fc9166babd5e5c7d3109ab6fef274a707f34beda612c9d04",// 9
"0x0c5d29f4f923e246ae9b8c4acd1324329437fa49b9c3e8c4eacd3a668a116fab",// 10
"0x27a2d03ea7a1a13f8dba960914fc7c7031f666a83381c1771680c65820cc6086",// 11
"0x2c33f6f61b7b08b3b56e6602485f79a810c7eb92bc08d7b37fc284254c069e5a",// 12
"0x2b21a6c0d38784bd8034a63654c3c1414fe7328a88511e7185b03f8502533478",// 13
"0x12c943c1f533a4c1357fa393a12aad59f8782437b42a436b0a82d5a73f0a5216",// 14
"0x1f7dff2a80564da8894bf9fde27237cf344612bfaab08ecdabc8804fd2ed7955",// 15
"0x281128f2ce3a98d98f9c134ca6cf493a84c04c0630e0dd170b5ea12f7060d85e",// 16
"0x23323c9fada751eafc927439fdc9000f875fba03005b1ba831581e3e5e2720b2",// 17
"0x24419f182b352138eda236f549d6cbf9f8249e69007a36ff430d9a2f97162636",// 18
"0x2a29a11d20ce5d61fa36108345ec67f48ed6face1d2782578b6dc38a1863abdf",// 19
"0x19f5038f92557e39950e33d63e7943327bf5a10cfbab76927cbbfea16025ef5d",// 20
"0x2a476b83c463da3bf5ffee66dc37c9086b60ecc5cb2e6c92f3597993216dc6b8",// 21
"0x2da77b3d85111b4e4e22cf178381e28bd3cf33bdda6002281bfc0a9bbbc06c95",// 22
"0x02f0e657ee452146bfbf03c8bbf226757037f2aa2db913ce0b241317b7f36c8f",// 23
"0x088230720d228bd06e0a1e9ba67b4d23ffd32e6ed29400870e66d5d8ebb2a4b3",// 24
"0x1ceed24352c6d531641b9e2f1733f023835f708f73c5ee964c2a5c12ccf75ae3",// 25
"0x2943033e9175e7e9678e68b7d49e199f4b15b5e602f2a9db838bf0ffc74f73af",// 26
"0x070dbb8ce4a0b749bf20d9f1f832490b42d7dac6dd03d3cb4b7fd2af39a9de17",// 27
"0x0add848ba8fd6361fbacfa30a981d423ca1c9588358e4f862b4c49d6772a5363",// 28
"0x1301244413098da001c17a576562d608cbe13c3a6bbc6c35a15cb02e102cb2f3",// 29
"0x144bc4cce778e82915be25e7289151a46a88c3c0a5f1bb5ff35eb9a19667be4e",// 30
"0x2688d58bf9b7e2730ab510122d6d24bdcacd07becc79eea37fff58a8edb074e5",// 31
"0x2753cfd5199dc55cf85933769e95affd5b112737e3b97540c74477322402b407" // ROOT
].map(hexToBigint);

// Creates a fixed height merkle-tree with MiMC hash function (just like MerkleTreeWithHistory.sol)
async function mimicMerkleTree(leaves = []) {
  const pedersen = await circomlibjs.buildPedersenHash(); //TODO, not needed, fromMontgomery is in mimc
  const mimcsponge = await circomlibjs.buildMimcSponge();

  const mimcspongeMultiHash = (left, right) =>
    leBufferToBigint(
      pedersen.babyJub.F.fromMontgomery(mimcsponge.multiHash([left, right]))
    );

  return new MerkleTree(MERKLE_TREE_HEIGHT, leaves, {
    hashFunction: mimcspongeMultiHash,
    zeroElement: ZERO_VALUES[0],
  });
}

module.exports = {
  mimicMerkleTree,
};
