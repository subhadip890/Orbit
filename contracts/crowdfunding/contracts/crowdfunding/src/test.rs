#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation},
    token, Address, Env, IntoVal,
};
use token::Client as TokenClient;
use token::StellarAssetClient as SAClient;

fn create_token<'a>(e: &Env, admin: &Address) -> (TokenClient<'a>, SAClient<'a>) {
    let sac = e.register_stellar_asset_contract_v2(admin.clone());
    (
        TokenClient::new(e, &sac.address()),
        SAClient::new(e, &sac.address()),
    )
}

#[test]
fn test_initialize_and_donate() {
    let env = Env::default();
    env.mock_all_auths();

    let owner = Address::generate(&env);
    let donor = Address::generate(&env);

    let (token, token_admin) = create_token(&env, &owner);

    // Mint 1000 XLM (in stroops) to donor
    token_admin.mint(&donor, &10_000_000_000_i128); // 1000 XLM

    let contract_id = env.register(CrowdfundingContract, ());
    let client = CrowdfundingContractClient::new(&env, &contract_id);

    // Initialize: goal = 100 XLM = 1_000_000_000 stroops
    client.initialize(&owner, &1_000_000_000_i128, &token.address);

    assert_eq!(client.get_goal(), 1_000_000_000_i128);
    assert_eq!(client.get_raised(), 0_i128);
    assert_eq!(client.get_donor_count(), 0_u32);

    // Donate 10 XLM
    let raised = client.donate(&donor, &100_000_000_i128);
    assert_eq!(raised, 100_000_000_i128);
    assert_eq!(client.get_raised(), 100_000_000_i128);
    assert_eq!(client.get_donor_count(), 1_u32);
    assert_eq!(client.get_donor_amount(&donor), 100_000_000_i128);

    // Second donation from same donor
    client.donate(&donor, &50_000_000_i128);
    assert_eq!(client.get_raised(), 150_000_000_i128);
    // Donor count stays 1 (same donor)
    assert_eq!(client.get_donor_count(), 1_u32);
}

#[test]
fn test_donate_rejected_if_zero() {
    let env = Env::default();
    env.mock_all_auths();

    let owner = Address::generate(&env);
    let donor = Address::generate(&env);
    let (token, _) = create_token(&env, &owner);

    let contract_id = env.register(CrowdfundingContract, ());
    let client = CrowdfundingContractClient::new(&env, &contract_id);

    client.initialize(&owner, &1_000_000_000_i128, &token.address);

    // Should panic on zero amount
    let result = std::panic::catch_unwind(|| {
        let env2 = Env::default();
        env2.mock_all_auths();
        let cid2 = env2.register(CrowdfundingContract, ());
        let c2 = CrowdfundingContractClient::new(&env2, &cid2);
        let o2 = Address::generate(&env2);
        let d2 = Address::generate(&env2);
        let (t2, _) = create_token(&env2, &o2);
        c2.initialize(&o2, &1_000_000_000_i128, &t2.address);
        c2.donate(&d2, &0_i128);
    });
    assert!(result.is_err(), "expected panic on zero donation");
}

#[test]
fn test_multiple_donors() {
    let env = Env::default();
    env.mock_all_auths();

    let owner = Address::generate(&env);
    let donor1 = Address::generate(&env);
    let donor2 = Address::generate(&env);
    let donor3 = Address::generate(&env);

    let (token, token_admin) = create_token(&env, &owner);
    token_admin.mint(&donor1, &1_000_000_000_i128);
    token_admin.mint(&donor2, &1_000_000_000_i128);
    token_admin.mint(&donor3, &1_000_000_000_i128);

    let contract_id = env.register(CrowdfundingContract, ());
    let client = CrowdfundingContractClient::new(&env, &contract_id);
    client.initialize(&owner, &3_000_000_000_i128, &token.address);

    client.donate(&donor1, &500_000_000_i128);
    client.donate(&donor2, &500_000_000_i128);
    client.donate(&donor3, &500_000_000_i128);

    assert_eq!(client.get_raised(), 1_500_000_000_i128);
    assert_eq!(client.get_donor_count(), 3_u32);
}
