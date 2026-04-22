#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

// Define the interface for the NFT contract so we can call it
mod nft_contract {
    soroban_sdk::contractimport!(
        file = "../../../stellar-nft/target/wasm32v1-none/release/stellar_nft.wasm"
    );
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    NftContract,
    XlmToken,
    UsdToXlmRate, // Simulated rate for conversion
}

#[contract]
pub struct NFTShop;

#[contractimpl]
impl NFTShop {
    /// Initialize the shop with the admin, NFT contract, and XLM token address
    pub fn init(env: Env, admin: Address, nft_contract: Address, xlm_token: Address, usd_rate: u32) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NftContract, &nft_contract);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);
        env.storage().instance().set(&DataKey::UsdToXlmRate, &usd_rate);
    }

    /// Buy an NFT. This will call the mint function on the NFT contract and transfer XLM.
    pub fn buy_nft(env: Env, buyer: Address, nft_id: u32, metadata: String, price_usd: u32) {
        buyer.require_auth();

        let nft_contract_id: Address = env.storage().instance().get(&DataKey::NftContract).unwrap();
        let xlm_token_id: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let usd_rate: u32 = env.storage().instance().get(&DataKey::UsdToXlmRate).unwrap();

        // Calculate XLM cost (price_usd * usd_rate * 10^7 for stroops)
        let xlm_amount = (price_usd as i128) * (usd_rate as i128) * 10_000_000i128;

        // Perform XLM transfer from buyer to shop
        let token_client = soroban_sdk::token::TokenClient::new(&env, &xlm_token_id);
        token_client.transfer(&buyer, &env.current_contract_address(), &xlm_amount);

        // Perform the Inter-Contract Call (ICC) to mint the NFT
        let nft_client = nft_contract::Client::new(&env, &nft_contract_id);
        nft_client.mint(&buyer, &nft_id, &metadata);
    }

    /// Sell back an NFT to the hub.
    pub fn sell_nft(env: Env, seller: Address, nft_id: u32, price_usd: u32) {
        seller.require_auth();

        let nft_contract_id: Address = env.storage().instance().get(&DataKey::NftContract).unwrap();
        let xlm_token_id: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let usd_rate: u32 = env.storage().instance().get(&DataKey::UsdToXlmRate).unwrap();

        // Perform the Inter-Contract Call (ICC) to transfer the NFT back to the shop
        let nft_client = nft_contract::Client::new(&env, &nft_contract_id);
        nft_client.transfer(&seller, &env.current_contract_address(), &nft_id);

        // Calculate payout (simulated 80% buyback of the original USD price)
        let total_xlm_value = (price_usd as i128) * (usd_rate as i128) * 10_000_000i128;
        let payout_amount = (total_xlm_value * 80) / 100; 

        // Transfer XLM back to the seller
        let token_client = soroban_sdk::token::TokenClient::new(&env, &xlm_token_id);
        token_client.transfer(&env.current_contract_address(), &seller, &payout_amount);
    }

    /// Admin can free/reset an NFT held by the contract
    pub fn admin_free_nft(env: Env, nft_id: u32) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let nft_contract_id: Address = env.storage().instance().get(&DataKey::NftContract).unwrap();
        let nft_client = nft_contract::Client::new(&env, &nft_contract_id);
        nft_client.burn(&nft_id);
    }

    /// Withdraw XLM from the shop treasury (Admin only)
    pub fn withdraw_xlm(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let xlm_token_id: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = soroban_sdk::token::TokenClient::new(&env, &xlm_token_id);
        
        token_client.transfer(&env.current_contract_address(), &to, &amount);
    }

    /// Update the simulated conversion rate
    pub fn update_rate(env: Env, new_rate: u32) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        env.storage().instance().set(&DataKey::UsdToXlmRate, &new_rate);
    }
}

mod test;
