#[cfg(test)]
mod tests {
    use soroban_sdk::{testutils::Address as _, Address, Env, String};
    use crate::{PlayerGuildContract, PlayerGuildContractClient, QuestStatus};

    fn setup() -> (Env, PlayerGuildContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, PlayerGuildContract);
        let client = PlayerGuildContractClient::new(&env, &contract_id);
        (env, client)
    }

    // ── Test 1: Happy path ──────────────────────────────────────────────────
    // Full MVP lifecycle: post → claim → complete
    #[test]
    fn test_full_quest_lifecycle() {
        let (env, client) = setup();

        let giver = Address::generate(&env);
        let hunter = Address::generate(&env);
        let title = String::from_str(&env, "Defeat the Dragon Boss");

        // Post quest
        let quest_id = client.post_quest(&giver, &title, &50_000_000); // 5 XLM
        assert_eq!(quest_id, 1);

        // Hunter claims
        client.claim_quest(&hunter, &quest_id);
        let quest = client.get_quest(&quest_id);
        assert_eq!(quest.status, QuestStatus::Claimed);
        assert_eq!(quest.hunter, Some(hunter.clone()));

        // Giver approves and settles
        client.complete_quest(&giver, &quest_id);
        let settled = client.get_quest(&quest_id);
        assert_eq!(settled.status, QuestStatus::Settled);
    }

    // ── Test 2: Edge case – giver cannot claim their own quest ──────────────
    #[test]
    #[should_panic(expected = "giver cannot be hunter")]
    fn test_giver_cannot_claim_own_quest() {
        let (env, client) = setup();

        let giver = Address::generate(&env);
        let title = String::from_str(&env, "Collect 100 herbs");

        let quest_id = client.post_quest(&giver, &title, &10_000_000);

        // Giver tries to claim their own quest – should panic
        client.claim_quest(&giver, &quest_id);
    }

    // ── Test 3: State verification – storage reflects correct values ────────
    #[test]
    fn test_storage_state_after_post() {
        let (env, client) = setup();

        let giver = Address::generate(&env);
        let title = String::from_str(&env, "Escort the merchant");

        let quest_id = client.post_quest(&giver, &title, &20_000_000);
        let quest = client.get_quest(&quest_id);

        assert_eq!(quest.id, 1);
        assert_eq!(quest.giver, giver);
        assert_eq!(quest.reward_xlm, 20_000_000);
        assert_eq!(quest.status, QuestStatus::Open);
        assert!(quest.hunter.is_none());
    }

    // ── Test 4: Cancel open quest ───────────────────────────────────────────
    #[test]
    fn test_cancel_open_quest() {
        let (env, client) = setup();

        let giver = Address::generate(&env);
        let title = String::from_str(&env, "Mine 50 gold ore");

        let quest_id = client.post_quest(&giver, &title, &5_000_000);
        client.cancel_quest(&giver, &quest_id);

        let quest = client.get_quest(&quest_id);
        assert_eq!(quest.status, QuestStatus::Cancelled);
    }

    // ── Test 5: Edge case – cannot claim a cancelled quest ──────────────────
    #[test]
    #[should_panic(expected = "quest is not open")]
    fn test_cannot_claim_cancelled_quest() {
        let (env, client) = setup();

        let giver = Address::generate(&env);
        let hunter = Address::generate(&env);
        let title = String::from_str(&env, "Brew a health potion");

        let quest_id = client.post_quest(&giver, &title, &7_000_000);
        client.cancel_quest(&giver, &quest_id);

        // Trying to claim a cancelled quest should panic
        client.claim_quest(&hunter, &quest_id);
    }
}
