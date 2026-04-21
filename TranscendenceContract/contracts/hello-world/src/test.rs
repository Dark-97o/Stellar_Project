#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, IntoVal, Symbol};
use soroban_sdk::token::StellarAssetClient;

#[test]
fn test_protocol_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let donor = Address::generate(&env);
    let recipient = Address::generate(&env);

    // Register the contract
    let contract_id = env.register(TranscendenceContract, ());
    let client = TranscendenceContractClient::new(&env, &contract_id);

    // Register a mock token (XLM)
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = token::Client::new(&env, &token_id);
    let token_admin_client = StellarAssetClient::new(&env, &token_id);

    // Initial goal: 10,000 units
    let goal = 10000;
    client.init(&admin, &token_id, &goal);

    // Verify initial stats
    let stats = client.get_stats();
    assert_eq!(stats.admin, admin);
    assert_eq!(stats.goal, goal);
    assert_eq!(stats.total, 0);
    assert_eq!(stats.is_active, true);

    // Mint some tokens to donor
    token_admin_client.mint(&donor, &5000);

    // Donate 3,000 units
    client.donate(&donor, &3000);

    // Verify stats after donation
    let stats = client.get_stats();
    assert_eq!(stats.total, 3000);
    assert_eq!(token_client.balance(&contract_id), 3000);
    assert_eq!(token_client.balance(&donor), 2000);

    // Test Admin: Set Goal
    client.set_goal(&15000);
    assert_eq!(client.get_stats().goal, 15000);

    // Test Admin: Deactivate
    client.set_active(&false);
    assert_eq!(client.get_stats().is_active, false);

    // Donation should fail when inactive
    let result = env.try_invoke_contract::<(), soroban_sdk::Error>(
        &contract_id,
        &Symbol::new(&env, "donate"),
        (&donor, 1000i128).into_val(&env),
    );
    assert!(result.is_err());

    // Reactivate and Withdraw
    client.set_active(&true);
    client.withdraw(&recipient);
    assert_eq!(token_client.balance(&recipient), 3000);
    assert_eq!(token_client.balance(&contract_id), 0);
}

#[test]
#[should_panic(expected = "PROTOCOL_ALREADY_INITIALIZED")]
fn test_prevent_double_init() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let contract_id = env.register(TranscendenceContract, ());
    let client = TranscendenceContractClient::new(&env, &contract_id);

    client.init(&admin, &token, &1000);
    client.init(&admin, &token, &1000);
}

#[test]
#[should_panic]
fn test_unauthorized_withdraw() {
    let env = Env::default();
    
    let admin = Address::generate(&env);
    let rogue = Address::generate(&env);
    let token_admin = Address::generate(&env);
    
    let contract_id = env.register(TranscendenceContract, ());
    let client = TranscendenceContractClient::new(&env, &contract_id);

    let token_id = env.register_stellar_asset_contract(token_admin.clone());

    // Init does not require auth, so this succeeds
    client.init(&admin, &token_id, &1000);

    // Withdraw requires admin auth. Since we haven't mocked auth, this should panic!
    client.withdraw(&rogue);
}

#[test]
fn test_set_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    
    let contract_id = env.register(TranscendenceContract, ());
    let client = TranscendenceContractClient::new(&env, &contract_id);

    let token_id = env.register_stellar_asset_contract(token_admin.clone());

    client.init(&admin, &token_id, &1000);
    assert_eq!(client.get_stats().admin, admin);

    client.set_admin(&new_admin);
    assert_eq!(client.get_stats().admin, new_admin);
}
