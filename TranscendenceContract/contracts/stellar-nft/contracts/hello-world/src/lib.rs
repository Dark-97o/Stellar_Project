#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Owner(u32),
    Metadata(u32),
}

#[contract]
pub struct StellarNFT;

#[contractimpl]
impl StellarNFT {
    /// Initialize the contract with an admin address
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Mint a new NFT. Only admin can call this.
    pub fn mint(env: Env, to: Address, id: u32, metadata: String) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if env.storage().persistent().has(&DataKey::Owner(id)) {
            panic!("NFT already exists");
        }

        env.storage().persistent().set(&DataKey::Owner(id), &to);
        env.storage().persistent().set(&DataKey::Metadata(id), &metadata);
    }

    /// Transfer an NFT to a new owner
    pub fn transfer(env: Env, from: Address, to: Address, id: u32) {
        from.require_auth();

        let owner: Address = env.storage().persistent().get(&DataKey::Owner(id)).unwrap();
        if owner != from {
            panic!("Not the owner");
        }

        env.storage().persistent().set(&DataKey::Owner(id), &to);
    }

    /// Get the owner of an NFT
    pub fn owner_of(env: Env, id: u32) -> Address {
        env.storage().persistent().get(&DataKey::Owner(id)).unwrap()
    }

    /// Get the metadata of an NFT
    pub fn get_metadata(env: Env, id: u32) -> String {
        env.storage().persistent().get(&DataKey::Metadata(id)).unwrap()
    }

    /// Burn an NFT (remove from storage). Only admin can call this.
    pub fn burn(env: Env, id: u32) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        env.storage().persistent().remove(&DataKey::Owner(id));
        env.storage().persistent().remove(&DataKey::Metadata(id));
    }
}

mod test;
