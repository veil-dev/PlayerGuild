// src/contexts/QuestStore.js
// Zustand store - manages quest state locally and syncs with contract events
import { create } from "zustand";

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
    title: "Gold farming run - 3 hrs in Lost Ark",
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
    title: "Rank push to Diamond - Mobile Legends",
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
    title: "Arena of Valor - 5v5 coaching session",
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
    title: "Genshin Impact - Spiral Abyss floor 12 clear",
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

export const useQuestStore = create((set, get) => ({
  quests: SEED_QUESTS,
  loading: false,
  filter: "all", // all | open | claimed | completed

  setFilter: (filter) => set({ filter }),

  getFiltered: () => {
    const { quests, filter } = get();
    if (filter === "all") return quests;
    return quests.filter((q) => q.status === filter);
  },

  // Simulate posting a quest (real version would call Soroban contract)
  postQuest: async ({ title, description, reward, game, tags, giverKey }) => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 1200)); // simulate tx latency
    const quest = {
      id: nextId++,
      title,
      description,
      reward: parseFloat(reward).toFixed(2),
      game,
      giver: giverKey,
      hunter: null,
      status: "open",
      createdAt: Date.now(),
      tags: tags || [],
    };
    set((s) => ({ quests: [quest, ...s.quests], loading: false }));
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
