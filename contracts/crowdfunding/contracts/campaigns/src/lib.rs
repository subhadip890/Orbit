#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, Map, String, Symbol, Val, IntoVal, token, symbol_short,
};

// ── Storage key enum ───────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    /// Platform admin address.
    Admin,
    /// Native XLM token contract address (SAC).
    Token,
    /// LeaderboardContract address — called on every donation.
    Leaderboard,
    /// Total number of campaigns ever created (monotonic counter, also next ID).
    CampaignCount,
    /// Campaign metadata by ID.
    Campaign(u32),
    /// Per-campaign donor map: donor address → total stroops donated to that campaign.
    CampaignDonors(u32),
}

// ── Campaign data struct ───────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Campaign {
    pub id: u32,
    pub title: String,
    pub description: String,
    /// Fundraising target in stroops (1 XLM = 10_000_000 stroops).
    pub goal: i128,
    /// Total stroops received so far.
    pub raised: i128,
    /// Campaign creator — receives funds on close.
    pub owner: Address,
    /// Number of unique donors.
    pub donor_count: u32,
    /// False once the owner closes the campaign.
    pub active: bool,
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct CampaignsContract;

#[contractimpl]
impl CampaignsContract {
    // ── Admin setup ───────────────────────────────────────────────────────────

    /// One-time initializer.
    /// `admin`       — platform admin
    /// `token`       — native XLM SAC contract address (testnet)
    /// `leaderboard` — deployed LeaderboardContract address
    pub fn initialize(env: Env, admin: Address, token: Address, leaderboard: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Leaderboard, &leaderboard);
        env.storage().instance().set(&DataKey::CampaignCount, &0_u32);
        env.storage().instance().extend_ttl(500_000, 500_000);
    }

    // ── Campaign lifecycle ────────────────────────────────────────────────────

    /// Create a new fundraising campaign. Returns the campaign ID.
    /// Caller becomes the campaign owner and must sign.
    pub fn create_campaign(
        env: Env,
        owner: Address,
        title: String,
        description: String,
        goal: i128,
    ) -> u32 {
        owner.require_auth();

        if goal <= 0 {
            panic!("goal must be positive");
        }

        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0);
        let id = count;

        let campaign = Campaign {
            id,
            title,
            description,
            goal,
            raised: 0,
            owner,
            donor_count: 0,
            active: true,
        };

        env.storage().instance().set(&DataKey::Campaign(id), &campaign);
        env.storage()
            .instance()
            .set(&DataKey::CampaignDonors(id), &Map::<Address, i128>::new(&env));
        env.storage().instance().set(&DataKey::CampaignCount, &(count + 1));
        env.storage().instance().extend_ttl(500_000, 500_000);

        env.events().publish(
            (symbol_short!("campaign"), symbol_short!("created")),
            (id, goal),
        );

        id
    }

    /// Donate `amount` stroops to campaign `campaign_id`.
    ///
    /// Flow:
    ///   1. Validate donor auth + campaign is active
    ///   2. token.transfer(donor → this contract)
    ///   3. Update Campaign.raised + donor map
    ///   4. ── Inter-contract call ── env.invoke_contract → leaderboard.record_donation
    ///   5. Emit donate event
    ///
    /// Returns the new total raised for the campaign.
    pub fn donate(env: Env, donor: Address, campaign_id: u32, amount: i128) -> i128 {
        donor.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let mut campaign: Campaign = env
            .storage()
            .instance()
            .get(&DataKey::Campaign(campaign_id))
            .unwrap_or_else(|| panic!("campaign not found"));

        if !campaign.active {
            panic!("campaign is closed");
        }

        // ── 1. Transfer tokens from donor to this contract ────────────────────
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&donor, &env.current_contract_address(), &amount);

        // ── 2. Update campaign state ──────────────────────────────────────────
        campaign.raised += amount;

        let mut donors: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::CampaignDonors(campaign_id))
            .unwrap_or_else(|| Map::new(&env));

        let prev = donors.get(donor.clone()).unwrap_or(0);
        if prev == 0 {
            campaign.donor_count += 1;
        }
        donors.set(donor.clone(), prev + amount);

        let total_raised = campaign.raised;

        env.storage().instance().set(&DataKey::Campaign(campaign_id), &campaign);
        env.storage()
            .instance()
            .set(&DataKey::CampaignDonors(campaign_id), &donors);
        env.storage().instance().extend_ttl(500_000, 500_000);

        // ── 3. Inter-contract call: notify LeaderboardContract ────────────────
        //
        // When this contract (CampaignsContract) calls env.invoke_contract on
        // the leaderboard, Soroban's auth system automatically satisfies
        // `hub.require_auth()` inside leaderboard.record_donation because
        // the INVOKING contract address == hub address stored in leaderboard.
        // No extra user signature is required for this sub-invocation.
        // ─────────────────────────────────────────────────────────────────────
        let leaderboard: Address =
            env.storage().instance().get(&DataKey::Leaderboard).unwrap();

        let args: soroban_sdk::Vec<Val> = soroban_sdk::vec![
            &env,
            (&donor).into_val(&env),
            amount.into_val(&env),
            campaign_id.into_val(&env),
        ];
        env.invoke_contract::<()>(
            &leaderboard,
            &Symbol::new(&env, "record_donation"),
            args,
        );
        // ─────────────────────────────────────────────────────────────────────

        // ── 4. Emit donation event ────────────────────────────────────────────
        env.events().publish(
            (symbol_short!("donate"), campaign_id),
            (donor, amount, total_raised),
        );

        total_raised
    }

    /// Close a campaign. Only the campaign owner may call this.
    /// Transfers all raised funds to the owner regardless of whether the
    /// goal was reached (owner decides when to close).
    pub fn close_campaign(env: Env, campaign_id: u32) {
        let mut campaign: Campaign = env
            .storage()
            .instance()
            .get(&DataKey::Campaign(campaign_id))
            .unwrap_or_else(|| panic!("campaign not found"));

        campaign.owner.require_auth();

        if !campaign.active {
            panic!("campaign already closed");
        }

        // Transfer accumulated funds to owner
        if campaign.raised > 0 {
            let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
            let token_client = token::Client::new(&env, &token);
            token_client.transfer(
                &env.current_contract_address(),
                &campaign.owner,
                &campaign.raised,
            );
        }

        campaign.active = false;
        env.storage().instance().set(&DataKey::Campaign(campaign_id), &campaign);

        env.events().publish(
            (symbol_short!("campaign"), symbol_short!("closed")),
            (campaign_id, campaign.raised),
        );
    }

    // ── Read-only views ───────────────────────────────────────────────────────

    pub fn get_campaign(env: Env, campaign_id: u32) -> Campaign {
        env.storage()
            .instance()
            .get(&DataKey::Campaign(campaign_id))
            .unwrap_or_else(|| panic!("campaign not found"))
    }

    pub fn get_campaign_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0)
    }

    pub fn get_donor_amount(env: Env, campaign_id: u32, donor: Address) -> i128 {
        let donors: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::CampaignDonors(campaign_id))
            .unwrap_or_else(|| Map::new(&env));
        donors.get(donor).unwrap_or(0)
    }
}

mod test;
