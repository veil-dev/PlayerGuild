#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    token, Address, Env, String,
};

// ─── Testnet token addresses ─────────────────────────────────────────────────
// XLM native asset wrapper on Soroban testnet
const XLM_CONTRACT: &str  = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
// USDC issued by Circle on Stellar testnet
const USDC_CONTRACT: &str = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

// ─── Storage Keys ────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Quest(u64),
    QuestCount,
}

// ─── Token Type ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum RewardToken {
    Xlm,
    Usdc,
}

// ─── Quest Status ────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum QuestStatus {
    Open,
    Claimed,
    Completed,
    Settled,
    Cancelled,
}

// ─── Quest Struct ────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct Quest {
    pub id: u64,
    pub giver: Address,
    pub hunter: Option<Address>,
    pub title: String,
    pub reward_amount: i128,      // amount in base units (stroops for XLM, micro-USDC for USDC)
    pub reward_token: RewardToken, // which token the reward is in
    pub status: QuestStatus,
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct PlayerGuildContract;

#[contractimpl]
impl PlayerGuildContract {

    /// post_quest – Giver posts a quest and transfers the reward into escrow.
    /// reward_amount is in base units: stroops for XLM, micro-USDC for USDC.
    pub fn post_quest(
        env: Env,
        giver: Address,
        title: String,
        reward_amount: i128,
        reward_token: RewardToken,
    ) -> u64 {
        giver.require_auth();
        assert!(reward_amount > 0, "reward must be positive");

        // Resolve the token contract address
        let token_address = Self::token_address(&env, &reward_token);
        let token_client = token::Client::new(&env, &token_address);

        // Transfer reward from giver into this contract (escrow)
        token_client.transfer(&giver, &env.current_contract_address(), &reward_amount);

        // Increment quest counter
        let id: u64 = env.storage().instance().get(&DataKey::QuestCount).unwrap_or(0) + 1;
        env.storage().instance().set(&DataKey::QuestCount, &id);

        let quest = Quest {
            id,
            giver,
            hunter: None,
            title,
            reward_amount,
            reward_token,
            status: QuestStatus::Open,
        };

        env.storage().persistent().set(&DataKey::Quest(id), &quest);

        env.events().publish(
            (symbol_short!("quest"), symbol_short!("posted")),
            id,
        );

        id
    }

    /// claim_quest – Hunter accepts an open quest.
    pub fn claim_quest(env: Env, hunter: Address, quest_id: u64) {
        hunter.require_auth();

        let mut quest: Quest = env
            .storage()
            .persistent()
            .get(&DataKey::Quest(quest_id))
            .expect("quest not found");

        assert!(quest.status == QuestStatus::Open, "quest is not open");
        assert!(quest.giver != hunter, "giver cannot be hunter");

        quest.hunter = Some(hunter.clone());
        quest.status = QuestStatus::Claimed;

        env.storage().persistent().set(&DataKey::Quest(quest_id), &quest);

        env.events().publish(
            (symbol_short!("quest"), symbol_short!("claimed")),
            (quest_id, hunter),
        );
    }

    /// complete_quest – Giver approves completion; contract releases escrowed
    /// reward directly to the hunter's wallet.
    pub fn complete_quest(env: Env, giver: Address, quest_id: u64) {
        giver.require_auth();

        let mut quest: Quest = env
            .storage()
            .persistent()
            .get(&DataKey::Quest(quest_id))
            .expect("quest not found");

        assert!(quest.giver == giver, "only giver can complete");
        assert!(quest.status == QuestStatus::Claimed, "quest must be claimed first");

        let hunter = quest.hunter.clone().expect("no hunter assigned");

        // Release escrowed reward to the hunter
        let token_address = Self::token_address(&env, &quest.reward_token);
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&env.current_contract_address(), &hunter, &quest.reward_amount);

        quest.status = QuestStatus::Settled;
        env.storage().persistent().set(&DataKey::Quest(quest_id), &quest);

        env.events().publish(
            (symbol_short!("quest"), symbol_short!("settled")),
            quest_id,
        );
    }

    /// cancel_quest – Giver cancels an open quest and gets the reward refunded.
    pub fn cancel_quest(env: Env, giver: Address, quest_id: u64) {
        giver.require_auth();

        let mut quest: Quest = env
            .storage()
            .persistent()
            .get(&DataKey::Quest(quest_id))
            .expect("quest not found");

        assert!(quest.giver == giver, "only giver can cancel");
        assert!(quest.status == QuestStatus::Open, "can only cancel open quests");

        // Refund escrowed reward back to giver
        let token_address = Self::token_address(&env, &quest.reward_token);
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&env.current_contract_address(), &giver, &quest.reward_amount);

        quest.status = QuestStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Quest(quest_id), &quest);

        env.events().publish(
            (symbol_short!("quest"), symbol_short!("cancelled")),
            quest_id,
        );
    }

    /// get_quest – Read a quest by id.
    pub fn get_quest(env: Env, quest_id: u64) -> Quest {
        env.storage()
            .persistent()
            .get(&DataKey::Quest(quest_id))
            .expect("quest not found")
    }

    // ─── Internal helpers ────────────────────────────────────────────────────

    fn token_address(env: &Env, token: &RewardToken) -> Address {
        match token {
            RewardToken::Xlm  => Address::from_string(&env, &String::from_str(&env, XLM_CONTRACT)),
            RewardToken::Usdc => Address::from_string(&env, &String::from_str(&env, USDC_CONTRACT)),
        }
    }
}