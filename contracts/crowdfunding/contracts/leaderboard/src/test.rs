#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

// ── Test 1: Basic record + read ────────────────────────────────────────────────

#[test]
fn test_initialize_and_record() {
    let env = Env::default();
    env.mock_all_auths();

    let hub = Address::generate(&env);
    let donor = Address::generate(&env);

    let contract_id = env.register(LeaderboardContract, ());
    let client = LeaderboardContractClient::new(&env, &contract_id);

    client.initialize(&hub);

    // Record a 10 XLM donation (in stroops)
    client.record_donation(&donor, &100_000_000_i128, &0_u32);

    assert_eq!(client.get_total_donated(&donor), 100_000_000_i128);
    assert_eq!(client.get_platform_total(), 100_000_000_i128);
    assert_eq!(client.get_donor_list().len(), 1);
}

// ── Test 2: Multiple distinct donors ──────────────────────────────────────────

#[test]
fn test_multiple_donors() {
    let env = Env::default();
    env.mock_all_auths();

    let hub = Address::generate(&env);
    let donor1 = Address::generate(&env);
    let donor2 = Address::generate(&env);
    let donor3 = Address::generate(&env);

    let contract_id = env.register(LeaderboardContract, ());
    let client = LeaderboardContractClient::new(&env, &contract_id);

    client.initialize(&hub);

    client.record_donation(&donor1, &100_000_000_i128, &0_u32);
    client.record_donation(&donor2, &200_000_000_i128, &0_u32);
    client.record_donation(&donor3, &300_000_000_i128, &1_u32);

    assert_eq!(client.get_platform_total(), 600_000_000_i128);
    assert_eq!(client.get_total_donated(&donor1), 100_000_000_i128);
    assert_eq!(client.get_total_donated(&donor2), 200_000_000_i128);
    assert_eq!(client.get_total_donated(&donor3), 300_000_000_i128);
    assert_eq!(client.get_donor_list().len(), 3);
}

// ── Test 3: Cumulative donations from the same donor ──────────────────────────

#[test]
fn test_cumulative_donations() {
    let env = Env::default();
    env.mock_all_auths();

    let hub = Address::generate(&env);
    let donor = Address::generate(&env);

    let contract_id = env.register(LeaderboardContract, ());
    let client = LeaderboardContractClient::new(&env, &contract_id);

    client.initialize(&hub);

    // Donate 3 times from the same address
    client.record_donation(&donor, &50_000_000_i128, &0_u32);
    client.record_donation(&donor, &75_000_000_i128, &1_u32);
    client.record_donation(&donor, &25_000_000_i128, &2_u32);

    assert_eq!(client.get_total_donated(&donor), 150_000_000_i128);
    assert_eq!(client.get_platform_total(), 150_000_000_i128);
}

// ── Test 4: Donor list stays unique (same donor donates multiple times) ────────

#[test]
fn test_donor_list_unique() {
    let env = Env::default();
    env.mock_all_auths();

    let hub = Address::generate(&env);
    let donor = Address::generate(&env);

    let contract_id = env.register(LeaderboardContract, ());
    let client = LeaderboardContractClient::new(&env, &contract_id);

    client.initialize(&hub);

    // Same donor donates 5 times
    for _ in 0..5_u32 {
        client.record_donation(&donor, &10_000_000_i128, &0_u32);
    }

    // Donor should appear exactly once in the list
    assert_eq!(client.get_donor_list().len(), 1);
    assert_eq!(client.get_total_donated(&donor), 50_000_000_i128);
}
