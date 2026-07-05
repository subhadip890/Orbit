#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, Vec, symbol_short,
};

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    /// Address of the CampaignsContract (hub). Only hub may call record_donation.
    Hub,
    /// Total stroops donated by a given address across ALL campaigns.
    DonorTotal(Address),
    /// Ordered list of all unique donor addresses seen so far.
    DonorList,
    /// Sum of every donation recorded by this leaderboard.
    PlatformTotal,
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct LeaderboardContract;

#[contractimpl]
impl LeaderboardContract {
    /// One-time initializer. `hub` is the CampaignsContract address that is
    /// allowed to call `record_donation`.
    pub fn initialize(env: Env, hub: Address) {
        if env.storage().instance().has(&DataKey::Hub) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Hub, &hub);
        env.storage().instance().set(&DataKey::DonorList, &Vec::<Address>::new(&env));
        env.storage().instance().set(&DataKey::PlatformTotal, &0_i128);
        env.storage().instance().extend_ttl(500_000, 500_000);
    }

    /// Record a donation. Called exclusively by the CampaignsContract via
    /// an inter-contract invocation. Requires auth from `hub`.
    ///
    /// Soroban automatically satisfies `hub.require_auth()` when the invoking
    /// contract IS the hub — no extra signature needed from the user.
    pub fn record_donation(env: Env, donor: Address, amount: i128, campaign_id: u32) {
        // Enforce caller == hub (campaigns contract)
        let hub: Address = env.storage().instance().get(&DataKey::Hub).unwrap();
        hub.require_auth();

        let prev: i128 = env
            .storage()
            .instance()
            .get(&DataKey::DonorTotal(donor.clone()))
            .unwrap_or(0);

        // First time we see this donor — append to list
        if prev == 0 {
            let mut list: Vec<Address> = env
                .storage()
                .instance()
                .get(&DataKey::DonorList)
                .unwrap_or_else(|| Vec::new(&env));
            list.push_back(donor.clone());
            env.storage().instance().set(&DataKey::DonorList, &list);
        }

        // Accumulate per-donor total
        env.storage()
            .instance()
            .set(&DataKey::DonorTotal(donor.clone()), &(prev + amount));

        // Accumulate platform-wide total
        let platform: i128 = env
            .storage()
            .instance()
            .get(&DataKey::PlatformTotal)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::PlatformTotal, &(platform + amount));

        env.storage().instance().extend_ttl(500_000, 500_000);

        // Emit leaderboard event (useful for real-time frontend streaming)
        env.events().publish(
            (symbol_short!("lb"), campaign_id),
            (donor, amount),
        );
    }

    // ── Read-only views ───────────────────────────────────────────────────────

    /// Total stroops donated by `donor` across all campaigns.
    pub fn get_total_donated(env: Env, donor: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::DonorTotal(donor))
            .unwrap_or(0)
    }

    /// All unique donor addresses (in order of first donation).
    pub fn get_donor_list(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::DonorList)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Sum of every donation recorded through this leaderboard.
    pub fn get_platform_total(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::PlatformTotal)
            .unwrap_or(0)
    }
}

mod test;
