export const GAMES = [
  "Ragnarok M",
  "Mobile Legends",
  "Genshin Impact",
  "Lost Ark",
  "Arena of Valor",
  "Wild Rift",
  "Honkai: Star Rail",
  "PUBG Mobile",
  "Valorant",
  "Dota 2",
  "Other",
];

export function getAvailableGames(quests = []) {
  const games = new Set(GAMES);

  quests.forEach((quest) => {
    if (quest.game) games.add(quest.game);
  });

  return [...games].sort((a, b) => a.localeCompare(b));
}
