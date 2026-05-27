import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

const aptosConfig = new AptosConfig({
  network:  Network.TESTNET,
  fullnode: process.env.APTOS_NODE_URL,
  indexer:  process.env.APTOS_INDEXER_URL,
});
const aptos  = new Aptos(aptosConfig);
const MODULE = process.env.APTOS_MODULE_ADDRESS;

function getSigner() {
  return Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(process.env.APTOS_PRIVATE_KEY),
  });
}

export async function recordDatasetUpload({ uploaderId, shelbyKey, datasetId, pricePerRead }) {
  const signer = getSigner();
  const tx = await aptos.transaction.build.simple({
    sender: signer.accountAddress,
    data: {
      function: `${MODULE}::catalog::register_dataset`,
      typeArguments: [],
      functionArguments: [uploaderId, shelbyKey, datasetId, Math.round(pricePerRead * 1e8)],
    },
  });
  const signed    = await aptos.transaction.sign({ signer, transaction: tx });
  const submitted = await aptos.transaction.submit.simple({ transaction: tx, senderAuthenticator: signed });
  const result    = await aptos.transaction.waitForTransaction({ transactionHash: submitted.hash });
  return { txHash: result.hash, success: result.success };
}

export async function recordReadProof({ datasetId, readerWallet, shelbyKey, priceCharged }) {
  const signer = getSigner();
  const tx = await aptos.transaction.build.simple({
    sender: signer.accountAddress,
    data: {
      function: `${MODULE}::catalog::record_read`,
      typeArguments: [],
      functionArguments: [datasetId, readerWallet, shelbyKey, Math.round(priceCharged * 1e8)],
    },
  });
  const signed    = await aptos.transaction.sign({ signer, transaction: tx });
  const submitted = await aptos.transaction.submit.simple({ transaction: tx, senderAuthenticator: signed });
  const result    = await aptos.transaction.waitForTransaction({ transactionHash: submitted.hash });
  return { txHash: result.hash, success: result.success };
}

export async function getProofsForDataset({ datasetId, limit = 20 }) {
  try {
    const query = `query { events(where:{account_address:{_eq:"${MODULE}"}},order_by:{transaction_block_height:desc},limit:${limit}){transaction_version data transaction_block_height} }`;
    const resp  = await aptos.queryIndexer({ query });
    return (resp.events || []).filter(e => e.data?.dataset_id === datasetId);
  } catch { return []; }
}

export async function verifyProofTx({ txHash }) {
  try {
    const tx = await aptos.transaction.getByHash({ transactionHash: txHash });
    return { verified: tx.success, tx };
  } catch {
    return { verified: false, tx: null };
  }
}
