import * as StellarSdk from '@stellar/stellar-sdk';
const rpcServer = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org');
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

async function check() {
  const CONTRACT_ID = "CA2HLEFQOV7TITGBR2XYWMZ6OVPPJMOHLFJYMWIZPZ2AKWCHGEFHWYG5";
  const DUMMY_PK = "GB2VHOGXRWAF53JHDTBXYV3FZUNSTTNCTAVA2M5NLVXPFDVYDSVE2HBJ";
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const dummyAccount = new StellarSdk.Account(DUMMY_PK, "0");
  const tx = new StellarSdk.TransactionBuilder(dummyAccount, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call("get_stats"))
    .setTimeout(30).build();
  
  const sim = await rpcServer.simulateTransaction(tx);
  if (sim.result?.retval) {
    console.log(StellarSdk.scValToNative(sim.result.retval));
  } else {
    console.log("SIM FAILED", sim.error);
  }
}

check();
