#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, token, Address, Env, String};
use token::Client as TokenClient;
use token::StellarAssetClient as SAClient;

// ── Inline mock leaderboard ────────────────────────────────────────────────────
//
// We intentionally do NOT import the `leaderboard` crate as a Cargo
// dev-dependency here. On Windows GNU the linker fails with
// "export ordinal too large" when a cdylib dev-dep is built with testutils.
//
// Instead we define a minimal mock that:
//   • Implements the SAME function signatures as LeaderboardContract
//   • Stores donation totals in instance storage (so tests can assert on them)
//   • Enforces `hub.require_auth()` — exactly like the real contract
//
// When campaigns.donate() calls env.invoke_contract(lb_id, "record_donation", …),
// Soroban's test runtime dispatches to this mock, proving inter-contract
// communication works end-to-end in the test environment.
// ─────────────────────────────────────────────────────────────────────────────

mod lb_mock {
    use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec};

    #[contracttype]
    enum LbKey {
        Hub,
        PlatformTotal,
        Donor(Address),
    }

    #[contract]
    pub struct MockLeaderboard;

    #[contractimpl]
    impl MockLeaderboard {
        pub fn initialize(env: Env, hub: Address) {
            env.storage().instance().set(&LbKey::Hub, &hub);
            env.storage().instance().set(&LbKey::PlatformTotal, &0_i128);
        }

        /// Same signature as the real LeaderboardContract.record_donation.
        /// Requires hub auth — automatically satisfied by the campaigns contract
        /// when it invokes this via env.invoke_contract.
        pub fn record_donation(env: Env, donor: Address, amount: i128, _campaign_id: u32) {
            let hub: Address = env.storage().instance().get(&LbKey::Hub).unwrap();
            hub.require_auth();

            let total: i128 = env
                .storage()
                .instance()
                .get(&LbKey::PlatformTotal)
                .unwrap_or(0);
            env.storage()
                .instance()
                .set(&LbKey::PlatformTotal, &(total + amount));

            let prev: i128 = env
                .storage()
                .instance()
                .get(&LbKey::Donor(donor.clone()))
                .unwrap_or(0);
            env.storage()
                .instance()
                .set(&LbKey::Donor(donor), &(prev + amount));
        }

        pub fn get_total_donated(env: Env, donor: Address) -> i128 {
            env.storage()
                .instance()
                .get(&LbKey::Donor(donor))
                .unwrap_or(0)
        }

        pub fn get_platform_total(env: Env) -> i128 {
            env.storage()
                .instance()
                .get(&LbKey::PlatformTotal)
                .unwrap_or(0)
        }

        pub fn get_donor_list(_env: Env) -> Vec<Address> {
            Vec::new(&_env)
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn create_token<'a>(env: &Env, admin: &Address) -> (TokenClient<'a>, SAClient<'a>) {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    (
        TokenClient::new(env, &sac.address()),
        SAClient::new(env, &sac.address()),
    )
}

/// Full test setup:
///   1. Create a SAC token
///   2. Register CampaignsContract (need its address before registering leaderboard)
///   3. Register MockLeaderboard with hub = campaigns address
///   4. Initialize campaigns with leaderboard address
fn setup<'a>(
    env: &'a Env,
) -> (
    TokenClient<'a>,
    SAClient<'a>,
    CampaignsContractClient<'a>,
    lb_mock::MockLeaderboardClient<'a>,
) {
    env.mock_all_auths();

    let admin = Address::generate(env);
    let (token, token_admin) = create_token(env, &admin);

    // Register campaigns first to get its contract address (used as lb hub)
    let campaigns_id = env.register(CampaignsContract, ());
    let campaigns = CampaignsContractClient::new(env, &campaigns_id);

    // Register mock leaderboard with hub = campaigns address
    let lb_id = env.register(lb_mock::MockLeaderboard, ());
    let lb = lb_mock::MockLeaderboardClient::new(env, &lb_id);
    lb.initialize(&campaigns_id);

    // Initialize campaigns pointing at the mock leaderboard
    campaigns.initialize(&admin, &token.address, &lb_id);

    (token, token_admin, campaigns, lb)
}

// ── Test 1: Create campaign and verify stored fields ──────────────────────────

#[test]
fn test_create_and_get_campaign() {
    let env = Env::default();
    let (_, _, campaigns, _) = setup(&env);

    let owner = Address::generate(&env);
    let id = campaigns.create_campaign(
        &owner,
        &String::from_str(&env, "Save the Rainforest"),
        &String::from_str(&env, "Fund reforestation in the Amazon"),
        &5_000_000_000_i128, // 500 XLM
    );

    assert_eq!(id, 0_u32);
    assert_eq!(campaigns.get_campaign_count(), 1_u32);

    let c = campaigns.get_campaign(&id);
    assert_eq!(c.id, 0);
    assert_eq!(c.goal, 5_000_000_000_i128);
    assert_eq!(c.raised, 0);
    assert_eq!(c.donor_count, 0);
    assert!(c.active);
}

// ── Test 2: Donate updates campaign AND leaderboard (inter-contract call) ──────

#[test]
fn test_donate_updates_campaign_and_leaderboard() {
    let env = Env::default();
    let (token, token_admin, campaigns, lb) = setup(&env);

    let owner = Address::generate(&env);
    let donor = Address::generate(&env);

    token_admin.mint(&donor, &1_000_000_000_i128); // fund donor with 100 XLM

    let id = campaigns.create_campaign(
        &owner,
        &String::from_str(&env, "Clean Oceans"),
        &String::from_str(&env, "Plastic cleanup"),
        &1_000_000_000_i128,
    );

    let amount = 100_000_000_i128; // 10 XLM
    let total = campaigns.donate(&donor, &id, &amount);

    // ── Campaign state
    assert_eq!(total, amount);
    assert_eq!(campaigns.get_campaign(&id).raised, amount);
    assert_eq!(campaigns.get_campaign(&id).donor_count, 1);
    assert_eq!(campaigns.get_donor_amount(&id, &donor), amount);

    // ── Leaderboard state — updated via env.invoke_contract inter-contract call
    assert_eq!(lb.get_total_donated(&donor), amount);
    assert_eq!(lb.get_platform_total(), amount);

    // ── Token balance moved from donor to campaigns contract
    assert_eq!(token.balance(&donor), 900_000_000_i128);
}

// ── Test 3: Two campaigns track donations independently ───────────────────────

#[test]
fn test_multiple_campaigns_independent() {
    let env = Env::default();
    let (_, token_admin, campaigns, lb) = setup(&env);

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let donor = Address::generate(&env);

    token_admin.mint(&donor, &2_000_000_000_i128);

    let id0 = campaigns.create_campaign(
        &owner1,
        &String::from_str(&env, "Campaign A"),
        &String::from_str(&env, "Description A"),
        &1_000_000_000_i128,
    );
    let id1 = campaigns.create_campaign(
        &owner2,
        &String::from_str(&env, "Campaign B"),
        &String::from_str(&env, "Description B"),
        &2_000_000_000_i128,
    );

    campaigns.donate(&donor, &id0, &300_000_000_i128);
    campaigns.donate(&donor, &id1, &500_000_000_i128);

    assert_eq!(campaigns.get_campaign(&id0).raised, 300_000_000_i128);
    assert_eq!(campaigns.get_campaign(&id1).raised, 500_000_000_i128);
    assert_eq!(lb.get_total_donated(&donor), 800_000_000_i128);
    assert_eq!(lb.get_platform_total(), 800_000_000_i128);
}

// ── Test 4: close_campaign transfers all raised funds to owner ────────────────

#[test]
fn test_close_campaign_transfers_funds() {
    let env = Env::default();
    let (token, token_admin, campaigns, _) = setup(&env);

    let owner = Address::generate(&env);
    let donor = Address::generate(&env);

    token_admin.mint(&donor, &1_000_000_000_i128);

    let id = campaigns.create_campaign(
        &owner,
        &String::from_str(&env, "Fund Me"),
        &String::from_str(&env, "Description"),
        &500_000_000_i128,
    );

    campaigns.donate(&donor, &id, &200_000_000_i128);
    assert_eq!(token.balance(&owner), 0_i128); // Owner has nothing yet

    campaigns.close_campaign(&id);

    assert_eq!(token.balance(&owner), 200_000_000_i128); // Funds transferred
    assert!(!campaigns.get_campaign(&id).active); // Marked inactive
}

// ── Test 5: Donating zero amount panics ───────────────────────────────────────

#[test]
#[should_panic]
fn test_donate_zero_amount_panics() {
    let env = Env::default();
    let (_, token_admin, campaigns, _) = setup(&env);

    let owner = Address::generate(&env);
    let donor = Address::generate(&env);

    token_admin.mint(&donor, &1_000_000_000_i128);

    let id = campaigns.create_campaign(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Test"),
        &100_000_000_i128,
    );

    campaigns.donate(&donor, &id, &0_i128); // must panic
}
