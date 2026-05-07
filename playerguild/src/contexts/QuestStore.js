// src/contexts/QuestStore.js
// Zustand store — manages quest state locally and syncs with contract events
import { create } from "zustand";
import { api } from "../utils/api";

// Seed data that mirrors what a real contract fetch would return
const SEED_QUESTS = [
  {
    id: 1,
    title: "Defeat the Dragon Boss in Ragnarok M",
    description:
      "Need a skilled player to carry me through Glast Heim Hard. Must be 150k+ CP. Will share loot.",
    reward: "5.00",
    game: "Ragnarok M",
    giver: "GABCD...1234",
    hunter: null,
    status: "open",
    createdAt: Date.now() - 3600000,
    tags: ["carry", "boss", "ragnarok"],
  },
  {
    id: 2,
    title: "Gold farming run — 3 hrs in Lost Ark",
    description:
      "Looking for someone to farm gold with me in Chaos Dungeons. 3-hour session, split the proceeds.",
    reward: "3.50",
    game: "Lost Ark",
    giver: "GEFGH...5678",
    hunter: "GIJKL...9012",
    status: "claimed",
    createdAt: Date.now() - 7200000,
    tags: ["farm", "gold", "lostark"],
  },
  {
    id: 3,
    title: "Rank push to Diamond — Mobile Legends",
    description:
      "Need a Diamond+ support main to duo queue with me this weekend. 10 games minimum.",
    reward: "8.00",
    game: "Mobile Legends",
    giver: "GMNOP...3456",
    hunter: "GQRST...7890",
    status: "completed",
    createdAt: Date.now() - 86400000,
    tags: ["ranked", "support", "mlbb"],
  },
  {
    id: 4,
    title: "Arena of Valor — 5v5 coaching session",
    description:
      "I want a 1-hour review of my replays + live coaching game. Must be Master tier or above.",
    reward: "12.00",
    game: "Arena of Valor",
    giver: "GUVWX...1122",
    hunter: null,
    status: "open",
    createdAt: Date.now() - 1800000,
    tags: ["coaching", "ranked", "aov"],
  },
  {
    id: 5,
    title: "Genshin Impact — Spiral Abyss floor 12 clear",
    description:
      "Need a co-op partner with strong DPS to help clear Floor 12-3. I have healer covered.",
    reward: "2.00",
    game: "Genshin Impact",
    giver: "GYZAB...3344",
    hunter: null,
    status: "open",
    createdAt: Date.now() - 900000,
    tags: ["abyss", "coop", "genshin"],
  },
];

let nextId = 6;

function fromApiQuest(row) {
  return {
    id: Number(row.quest_id),
    title: row.title,
    description: row.description,
    reward: parseFloat(row.reward_amount || 0).toFixed(2),
    rewardToken: row.reward_token || "XLM",
    game: row.game,
    giver: row.giver_address,
    hunter: null,
    status: "open",
    createdAt: row.created_at ? Number(row.created_at) * 1000 : Date.now(),
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}

function makeQuestId() {
  return Math.floor(100000000 + Math.random() * 1900000000);
}

export const useQuestStore = create((set, get) => ({
  quests: SEED_QUESTS,
  loading: false,
  loaded: false,
  error: null,
  filter: "all", // all | open | claimed | completed

  setFilter: (filter) => set({ filter }),

  loadQuests: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const data = await api.getQuests({ limit: 100 });
      const quests = (data.quests || []).map(fromApiQuest);
      set({ quests, loaded: true, loading: false });
    } catch (e) {
      console.warn("Quest API load failed, using demo quests:", e);
      set({ loaded: true, loading: false, error: e.message });
    }
  },

  getFiltered: () => {
    const { quests, filter } = get();
    if (filter === "all") return quests;
    return quests.filter((q) => q.status === filter);
  },

  postQuest: async ({ title, description, reward, game, tags, rewardToken = "XLM", giverKey }) => {
    set({ loading: true });
    const quest = {
      id: makeQuestId(),
      title,
      description,
      reward: parseFloat(reward).toFixed(2),
      rewardToken,
      game,
      giver: giverKey,
      hunter: null,
      status: "open",
      createdAt: Date.now(),
      tags: tags || [],
    };

    try {
      await api.saveQuest({
        quest_id: quest.id,
        title,
        description,
        game,
        tags: quest.tags,
        reward_amount: quest.reward,
        reward_token: rewardToken,
        giver_address: giverKey,
      });
      set((s) => ({ quests: [quest, ...s.quests], loading: false }));
    } catch (e) {
      console.warn("Quest API save failed, keeping quest local only:", e);
      const fallbackQuest = { ...quest, id: nextId++ };
      set((s) => ({ quests: [fallbackQuest, ...s.quests], loading: false, error: e.message }));
      throw e;
    }
    return quest;
  },

  claimQuest: async (questId, hunterKey) => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 1000));
    set((s) => ({
      quests: s.quests.map((q) =>
        q.id === questId ? { ...q, status: "claimed", hunter: hunterKey } : q
      ),
      loading: false,
    }));
  },

  completeQuest: async (questId) => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 1000));
    set((s) => ({
      quests: s.quests.map((q) =>
        q.id === questId ? { ...q, status: "completed" } : q
      ),
      loading: false,
    }));
  },

  cancelQuest: async (questId) => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 800));
    set((s) => ({
      quests: s.quests.map((q) =>
        q.id === questId ? { ...q, status: "cancelled" } : q
      ),
      loading: false,
    }));
  },
}));
