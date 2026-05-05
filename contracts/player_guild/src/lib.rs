#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Symbol, String,
};

// ─── Storage Keys ───────────────────────────────────────────────────────────

/// Unique key for a quest stored as (quest_id → Quest)
#[contracttype]
pub enum DataKey {
    Quest(u64),      // quest data by id
    QuestCount,      // total number of quests ever created
}

// ─── Quest Status ────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum QuestStatus {
    Open,       // quest is available for hunters
    Claimed,    // a hunter has accepted the quest
    Completed,  // work submitted; awaiting giver approval
    Settled,    // payment released; quest finalized
    Cancelled,  // giver cancelled before a hunter claimed
}

// ─── Quest Struct ────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct Quest {
    pub id: u64,
    pub giver: Address,            // quest poster (employer)
    pub hunter: Option<Address>,   // assigned hunter (freelancer)
    pub title: String,             // short quest title
    pub reward_xlm: i128,          // reward amount in stroops (1 XLM = 10_000_000)
    pub status: QuestStatus,
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct PlayerGuildContract;

#[contractimpl]
impl PlayerGuildContract {

    /// post_quest – A quest giver posts a new job with a reward in XLM stroops.
    /// The reward is locked into the contract via Stellar native asset transfer
    /// (handled off-chain before calling; contract records the escrow intent).
    pub fn post_quest(
        env: Env,
        giver: Address,
        title: String,
        reward_xlm: i128,
    ) -> u64 {
        // Require the giver to authorise this call (Stellar auth model)
        giver.require_auth();

        // Reward must be positive
        assert!(reward_xlm > 0, "reward must be positive");

        // Increment global quest counter
        let id: u64 = env.storage().instance().get(&DataKey::QuestCount).unwrap_or(0) + 1;
        env.storage().instance().set(&DataKey::QuestCount, &id);

        let quest = Quest {
            id,
            giver,
            hunter: None,
            title,
            reward_xlm,
            status: QuestStatus::Open,
        };

        // Persist quest in contract storage
        env.storage().persistent().set(&DataKey::Quest(id), &quest);

        // Emit event so off-chain listeners can index the new quest
        env.events().publish(
            (symbol_short!("quest"), symbol_short!("posted")),
            id,
        );

        id // return the new quest id to the caller
    }

    /// claim_quest – A hunter (gig worker) accepts an open quest.
    /// Only one hunter can claim; once claimed the quest is locked to them.
    pub fn claim_quest(env: Env, hunter: Address, quest_id: u64) {
        hunter.require_auth();

        let mut quest: Quest = env
            .storage()
            .persistent()
            .get(&DataKey::Quest(quest_id))
            .expect("quest not found");

        // Guard: quest must still be open
        assert!(quest.status == QuestStatus::Open, "quest is not open");

        // Guard: giver cannot claim their own quest
        assert!(quest.giver != hunter, "giver cannot be hunter");

        quest.hunter = Some(hunter.clone());
        quest.status = QuestStatus::Claimed;

        env.storage().persistent().set(&DataKey::Quest(quest_id), &quest);

        env.events().publish(
            (symbol_short!("quest"), symbol_short!("claimed")),
            (quest_id, hunter),
        );
    }

    /// complete_quest – The giver marks work as done and releases the XLM reward.
    /// In a production build this would trigger a Stellar native transfer to the hunter.
    /// Here we update state; the front-end/relayer executes the payment.
    pub fn complete_quest(env: Env, giver: Address, quest_id: u64) {
        giver.require_auth();

        let mut quest: Quest = env
            .storage()
            .persistent()
            .get(&DataKey::Quest(quest_id))
            .expect("quest not found");

        // Only the original giver may approve completion
        assert!(quest.giver == giver, "only giver can complete");
        assert!(quest.status == QuestStatus::Claimed, "quest must be claimed first");

        quest.status = QuestStatus::Settled;

        env.storage().persistent().set(&DataKey::Quest(quest_id), &quest);

        env.events().publish(
            (symbol_short!("quest"), symbol_short!("settled")),
            quest_id,
        );
    }

    /// cancel_quest – The giver cancels an open quest (before any hunter claims it).
    pub fn cancel_quest(env: Env, giver: Address, quest_id: u64) {
        giver.require_auth();

        let mut quest: Quest = env
            .storage()
            .persistent()
            .get(&DataKey::Quest(quest_id))
            .expect("quest not found");

        assert!(quest.giver == giver, "only giver can cancel");
        assert!(quest.status == QuestStatus::Open, "can only cancel open quests");

        quest.status = QuestStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Quest(quest_id), &quest);

        env.events().publish(
            (symbol_short!("quest"), symbol_short!("cancelled")),
            quest_id,
        );
    }

    /// get_quest – Read a quest by id (view function, no state change).
    pub fn get_quest(env: Env, quest_id: u64) -> Quest {
        env.storage()
            .persistent()
            .get(&DataKey::Quest(quest_id))
            .expect("quest not found")
    }
}
