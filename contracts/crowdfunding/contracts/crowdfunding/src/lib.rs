#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Symbol, Vec, Map, token,
    log,
};

// ── Storage keys ──────────────────────────────────────────────────────────────

const GOAL: Symbol        = symbol_short!("GOAL");
const RAISED: Symbol      = symbol_short!("RAISED");
const OWNER: Symbol       = symbol_short!("OWNER");
const TOKEN: Symbol       = symbol_short!("TOKEN");
const DONORS: Symbol      = symbol_short!("DONORS");
const DONOR_CNT: Symbol   = symbol_short!("DCNT");

// ── Events ────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DonationEvent {
    pub donor: Address,
    pub amount: i128,
    pub total_raised: i128,
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct CrowdfundingContract;

#[contractimpl]
impl CrowdfundingContract {
    /// Initialize the contract.
    /// `owner`     — receives funds when goal is met
    /// `goal`      — target amount in stroops (1 XLM = 10_000_000 stroops)
    /// `token`     — native XLM token contract id on testnet
    pub fn initialize(env: Env, owner: Address, goal: i128, token: Address) {
        // Only initialize once
        if env.storage().instance().has(&OWNER) {
            panic!("already initialized");
        }
        env.storage().instance().set(&OWNER, &owner);
        env.storage().instance().set(&GOAL, &goal);
        env.storage().instance().set(&TOKEN, &token);
        env.storage().instance().set(&RAISED, &0_i128);
        env.storage().instance().set(&DONOR_CNT, &0_u32);
        env.storage().instance().set(&DONORS, &Map::<Address, i128>::new(&env));
        // Extend instance TTL to ~30 days (testnet block time ~5s, ~500k ledgers/month)
        env.storage().instance().extend_ttl(500_000, 500_000);
    }

    /// Donate `amount` stroops to the campaign.
    /// Caller must have approved this contract to transfer from their account.
    pub fn donate(env: Env, donor: Address, amount: i128) -> i128 {
        donor.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let token_id: Address = env.storage().instance().get(&TOKEN).unwrap();
        let token_client = token::Client::new(&env, &token_id);

        // Transfer from donor to this contract
        token_client.transfer(&donor, &env.current_contract_address(), &amount);

        // Update totals
        let mut raised: i128 = env.storage().instance().get(&RAISED).unwrap_or(0);
        raised += amount;
        env.storage().instance().set(&RAISED, &raised);

        // Update donor map
        let mut donors: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DONORS)
            .unwrap_or(Map::new(&env));
        let prev = donors.get(donor.clone()).unwrap_or(0);
        donors.set(donor.clone(), prev + amount);
        env.storage().instance().set(&DONORS, &donors);

        // Update donor count
        if prev == 0 {
            let mut cnt: u32 = env.storage().instance().get(&DONOR_CNT).unwrap_or(0);
            cnt += 1;
            env.storage().instance().set(&DONOR_CNT, &cnt);
        }

        // Emit event
        env.events().publish(
            (symbol_short!("donate"), donor.clone()),
            (amount, raised),
        );

        log!(&env, "Donation: {} stroops from {}, total={}", amount, donor, raised);

        raised
    }

    /// Withdraw all raised funds to owner (only when goal is met).
    pub fn withdraw(env: Env) {
        let owner: Address = env.storage().instance().get(&OWNER).unwrap();
        owner.require_auth();

        let goal: i128 = env.storage().instance().get(&GOAL).unwrap();
        let raised: i128 = env.storage().instance().get(&RAISED).unwrap_or(0);

        if raised < goal {
            panic!("goal not reached yet");
        }

        let token_id: Address = env.storage().instance().get(&TOKEN).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(&env.current_contract_address(), &owner, &raised);

        env.storage().instance().set(&RAISED, &0_i128);
    }

    // ── Read-only views ───────────────────────────────────────────────────────

    pub fn get_goal(env: Env) -> i128 {
        env.storage().instance().get(&GOAL).unwrap_or(0)
    }

    pub fn get_raised(env: Env) -> i128 {
        env.storage().instance().get(&RAISED).unwrap_or(0)
    }

    pub fn get_donor_count(env: Env) -> u32 {
        env.storage().instance().get(&DONOR_CNT).unwrap_or(0)
    }

    pub fn get_owner(env: Env) -> Address {
        env.storage().instance().get(&OWNER).unwrap()
    }

    pub fn get_donor_amount(env: Env, donor: Address) -> i128 {
        let donors: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DONORS)
            .unwrap_or(Map::new(&env));
        donors.get(donor).unwrap_or(0)
    }
}

mod test;
