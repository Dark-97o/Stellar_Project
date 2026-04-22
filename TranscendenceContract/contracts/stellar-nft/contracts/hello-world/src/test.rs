#![cfg(test)]
use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Env, String};

#[test]
fn test_mint_and_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let contract_id = env.register_contract(None, StellarNFT);
    let client = StellarNFTClient::new(&env, &contract_id);

    // Initialize
    client.init(&admin);

    // Mint NFT
    let metadata = String::from_str(&env, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3hlgtifvun3p6zq");
    client.mint(&user1, &1, &metadata);

    // Verify ownership and metadata
    assert_eq!(client.owner_of(&1), user1);
    assert_eq!(client.get_metadata(&1), metadata);

    // Transfer
    client.transfer(&user1, &user2, &1);
    assert_eq!(client.owner_of(&1), user2);
}

#[test]
#[should_panic(expected = "Not the owner")]
fn test_transfer_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let contract_id = env.register_contract(None, StellarNFT);
    let client = StellarNFTClient::new(&env, &contract_id);

    client.init(&admin);
    client.mint(&user1, &1, &String::from_str(&env, "metadata"));

    // User 2 tries to transfer User 1's NFT
    client.transfer(&user2, &admin, &1);
}
