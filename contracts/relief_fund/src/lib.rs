#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, Symbol};

#[contracttype]
pub enum DataKey {
    Total,
    Goal,
    Donors,
}

#[contract]
pub struct ReliefFundContract;

#[contractimpl]
impl ReliefFundContract {
    /// Initialize the fund with a target goal (in stroops)
    pub fn init(env: Env, goal: i128) {
        if env.storage().instance().has(&DataKey::Goal) {
            panic!("STATION_ALREADY_INITIALIZED");
        }
        env.storage().instance().set(&DataKey::Goal, &goal);
        env.storage().instance().set(&DataKey::Total, &0i128);
    }

    /// Donate to the fund
    pub fn donate(env: Env, donor: Address, amount: i128) {
        donor.require_auth();

        // Update Total
        let mut total: i128 = env.storage().instance().get(&DataKey::Total).unwrap_or(0);
        total += amount;
        env.storage().instance().set(&DataKey::Total, &total);

        // Update Leaderboard
        let mut donors: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::Donors)
            .unwrap_or(Map::new(&env));
        
        let current_donation = donors.get(donor.clone()).unwrap_or(0);
        donors.set(donor.clone(), current_donation + amount);
        env.storage().instance().set(&DataKey::Donors, &donors);

        // Emit Event for real-time tracking
        env.events().publish(
            (Symbol::new(&env, "donation"), donor),
            amount,
        );
    }

    /// Get current status
    pub fn status(env: Env) -> (i128, i128) {
        let total = env.storage().instance().get(&DataKey::Total).unwrap_or(0);
        let goal = env.storage().instance().get(&DataKey::Goal).unwrap_or(0);
        (total, goal)
    }

    /// Get leaderboard
    pub fn leaderboard(env: Env) -> Map<Address, i128> {
        env.storage()
            .instance()
            .get(&DataKey::Donors)
            .unwrap_or(Map::new(&env))
    }
}
