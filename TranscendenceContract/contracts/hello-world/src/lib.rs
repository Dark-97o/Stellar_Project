#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, contractevent,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Goal,
    Total,
    IsActive,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct ProtocolStats {
    pub admin: Address,
    pub token: Address,
    pub goal: i128,
    pub total: i128,
    pub is_active: bool,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct DonationEvent {
    pub donor: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct WithdrawalEvent {
    pub recipient: Address,
    pub amount: i128,
}

#[contract]
pub struct TranscendenceContract;

#[contractimpl]
impl TranscendenceContract {
    /// Initialize the Transcendence Protocol
    /// @param admin The administrative authority
    /// @param token The Stellar Asset Contract (SAC) address to be used
    /// @param goal The target resource goal (in stroops/base units)
    pub fn init(env: Env, admin: Address, token: Address, goal: i128) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("PROTOCOL_ALREADY_INITIALIZED");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Goal, &goal);
        env.storage().instance().set(&DataKey::Total, &0i128);
        env.storage().instance().set(&DataKey::IsActive, &true);
    }

    /// Donate resources to the communal pool
    /// @param donor The address contributing tokens
    /// @param amount The amount of tokens to contribute
    pub fn donate(env: Env, donor: Address, amount: i128) {
        donor.require_auth();

        let is_active: bool = env.storage().instance().get(&DataKey::IsActive).unwrap_or(false);
        if !is_active {
            panic!("PROTOCOL_INACTIVE");
        }

        if amount <= 0 {
            panic!("INVALID_AMOUNT");
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let client = token::Client::new(&env, &token_addr);

        // Transfer tokens from donor to this contract
        client.transfer(&donor, &env.current_contract_address(), &amount);

        // Update accounting
        let mut total: i128 = env.storage().instance().get(&DataKey::Total).unwrap_or(0);
        total += amount;
        env.storage().instance().set(&DataKey::Total, &total);

        // Emit Event for frontend real-time tracking
        DonationEvent { donor, amount }.publish(&env);
    }

    /// Withdraw funds from the pool (Admin only)
    /// @param to The destination address for the resources
    pub fn withdraw(env: Env, to: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let client = token::Client::new(&env, &token_addr);

        let balance = client.balance(&env.current_contract_address());
        client.transfer(&env.current_contract_address(), &to, &balance);

        WithdrawalEvent { recipient: to, amount: balance }.publish(&env);
    }

    /// Administrative: Update the protocol goal
    pub fn set_goal(env: Env, new_goal: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Goal, &new_goal);
    }

    /// Administrative: Toggle protocol activity status
    pub fn set_active(env: Env, active: bool) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::IsActive, &active);
    }

    /// Administrative: Transfer admin authority
    pub fn set_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    /// Query current protocol statistics
    pub fn get_stats(env: Env) -> ProtocolStats {
        ProtocolStats {
            admin: env.storage().instance().get(&DataKey::Admin).unwrap(),
            token: env.storage().instance().get(&DataKey::Token).unwrap(),
            goal: env.storage().instance().get(&DataKey::Goal).unwrap_or(0),
            total: env.storage().instance().get(&DataKey::Total).unwrap_or(0),
            is_active: env.storage().instance().get(&DataKey::IsActive).unwrap_or(false),
        }
    }
}

mod test;
