import { 
  rpc, 
  Networks, 
  TransactionBuilder, 
  Operation, 
  Keypair, 
  BASE_FEE,
  StrKey,
  nativeToScVal
} from '@stellar/stellar-sdk';
import fs from 'fs';

/**
 * SURVIVOR NETWORK HUB - Deployment Protocol v2.0
 * PURPOSE: Deploys and initializes the Relief Fund Soroban contract.
 * USAGE: Set STELLAR_SECRET env var and run 'node deploy.js'
 */

const RPC_URL = "https://soroban-testnet.stellar.org";
const server = new rpc.Server(RPC_URL);

async function deployAndInit() {
  const secretKey = process.env.STELLAR_SECRET;
  if (!secretKey) {
    console.error("❌ ERROR: STELLAR_SECRET environment variable not set.");
    process.exit(1);
  }

  const kp = Keypair.fromSecret(secretKey);
  const wasmPath = "./contracts/relief_fund/target/wasm32-unknown-unknown/release/relief_fund.optimized.wasm";
  
  if (!fs.existsSync(wasmPath)) {
    console.error(`❌ ERROR: WASM not found at ${wasmPath}. Run 'cargo build' first.`);
    process.exit(1);
  }

  const wasm = fs.readFileSync(wasmPath);
  let account = await server.getAccount(kp.publicKey());

  console.log(`🚀 DEPLOYING FROM: ${kp.publicKey()}`);

  try {
    // 1. Upload WASM
    console.log("📤 STEP 1: UPLOADING WASM...");
    const uploadOp = Operation.uploadContractWasm({ wasm });
    const txUpload = new TransactionBuilder(account, { 
      fee: BASE_FEE, 
      networkPassphrase: Networks.TESTNET 
    })
      .addOperation(uploadOp)
      .setTimeout(60)
      .build();

    txUpload.sign(kp);
    const uploadResponse = await server.sendTransaction(txUpload);
    const uploadResult = await pollTransaction(uploadResponse.hash);
    const wasmId = uploadResult.wasmId;
    console.log(`✅ WASM UPLOADED! ID: ${wasmId}`);

    // 2. Instantiate
    account = await server.getAccount(kp.publicKey());
    console.log("🏗️ STEP 2: INSTANTIATING CONTRACT...");
    const createOp = Operation.createCustomContract({
      wasmId,
      address: kp.publicKey()
    });
    
    const txCreate = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(createOp)
      .setTimeout(60)
      .build();

    txCreate.sign(kp);
    const createResponse = await server.sendTransaction(txCreate);
    const createResult = await pollTransaction(createResponse.hash);
    const contractId = createResult.contractId;
    console.log(`🎊 CONTRACT DEPLOYED! ID: ${contractId}`);

    // 3. Initialize
    account = await server.getAccount(kp.publicKey());
    console.log("⚙️  STEP 3: INITIALIZING WITH GOAL 10,000 XLM...");
    const initOp = Operation.invokeContractFunction({
      contract: contractId,
      function: "init",
      args: [nativeToScVal(10000, { type: "i128" })]
    });

    const txInit = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(initOp)
      .setTimeout(60)
      .build();

    txInit.sign(kp);
    await server.sendTransaction(txInit);
    console.log("🏁 DEPLOYMENT COMPLETE.");
    console.log(`\n========================================`);
    console.log(`>>> CONTRACT_ID: ${contractId} <<<`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error("❌ DEPLOYMENT FAILED:", err);
  }
}

async function pollTransaction(hash) {
  while (true) {
    const res = await server.getTransaction(hash);
    if (res.status === "SUCCESS") {
      return res;
    } else if (res.status === "FAILED") {
      throw new Error("Transaction failed on-chain");
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

deployAndInit();
