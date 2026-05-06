// src/pages/QuestBoard.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Sword, TrendingUp } from "lucide-react";
import { useQuestStore } from "../contexts/QuestStore";
import QuestCard from "../components/QuestCard";
import StatsBar from "../components/StatsBar";
import { getAvailableGames } from "../utils/games";
import "./QuestBoard.css";

const FILTERS = [
  { key: "all", label: "All Quests" },
  { key: "open", label: "Open" },
  { key: "claimed", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

const MAX_GAME_SUGGESTIONS = 6;
const MAX_TAG_SUGGESTIONS = 8;

export default function QuestBoard() {
  const { quests, filter, setFilter, getFiltered } = useQuestStore();
  const [search, setSearch] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const query = normalizeSearch(search);

  const availableGames = useMemo(() => getAvailableGames(quests), [quests]);
  const gameItems = useMemo(
    () =>
      availableGames.map((game) => ({
        game,
        count: quests.filter((quest) => quest.game === game).length,
      })),
    [availableGames, quests]
  );

  const gameSuggestions = useMemo(() => {
    if (!query) return availableGames.slice(0, MAX_GAME_SUGGESTIONS);

    return availableGames
      .filter((game) => game.toLowerCase().includes(query))
      .slice(0, MAX_GAME_SUGGESTIONS);
  }, [availableGames, query]);

  const tagSuggestions = useMemo(() => {
    if (!query || gameSuggestions.length === 0) return [];

    const matchingGames = new Set(gameSuggestions.map((game) => game.toLowerCase()));
    const tagCounts = new Map();

    quests.forEach((quest) => {
      if (!matchingGames.has(quest.game.toLowerCase())) return;

      quest.tags?.forEach((tag) => {
        const normalizedTag = tag.toLowerCase();
        tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
      });
    });

    return [...tagCounts.entries()]
      .sort(([aTag, aCount], [bTag, bCount]) => bCount - aCount || aTag.localeCompare(bTag))
      .slice(0, MAX_TAG_SUGGESTIONS)
      .map(([tag, count]) => ({ tag, count }));
  }, [quests, gameSuggestions, query]);

  const hasSearchSuggestions = gameSuggestions.length > 0 || tagSuggestions.length > 0;

  const filtered = getFiltered().filter((q) => {
    if (!query) return true;
    return (
      q.title.toLowerCase().includes(query) ||
      q.game.toLowerCase().includes(query) ||
      q.description.toLowerCase().includes(query) ||
      q.status.toLowerCase().includes(query) ||
      q.reward.toLowerCase().includes(query) ||
      q.giver.toLowerCase().includes(query) ||
      q.hunter?.toLowerCase().includes(query) ||
      q.tags?.some((t) => t.toLowerCase().includes(query))
    );
  });

  const selectSearchSuggestion = (value) => {
    setSearch(value);
    setShowSearchSuggestions(false);
  };

  return (
    <div className="page">
      {/* Hero */}
      <div className="board-hero">
        <div className="board-hero-text">
          <h1 className="board-title">
            <Sword size={22} className="board-title-icon" />
            Quest Board
          </h1>
          <p className="board-subtitle">
            Trustless gig escrow for gamers - powered by Stellar Soroban
          </p>
        </div>
        <Link to="/post" className="btn-post-quest">
          + Post Quest
        </Link>
      </div>

      {/* Stats */}
      <StatsBar quests={quests} />

      {/* Controls */}
      <div className="board-controls">
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search quests, games, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setShowSearchSuggestions(true)}
            onBlur={() => setShowSearchSuggestions(false)}
            aria-expanded={showSearchSuggestions && hasSearchSuggestions}
            aria-controls="quest-search-suggestions"
            role="combobox"
          />
          {showSearchSuggestions && hasSearchSuggestions && (
            <div className="search-suggestions" id="quest-search-suggestions" role="listbox">
              {gameSuggestions.length > 0 && (
                <div className="suggestion-group">
                  <div className="suggestion-heading">Games</div>
                  {gameSuggestions.map((game) => (
                    <button
                      key={game}
                      type="button"
                      className="suggestion-item"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSearchSuggestion(game);
                      }}
                      role="option"
                      aria-selected={search === game}
                    >
                      <span>{game}</span>
                      <small>title</small>
                    </button>
                  ))}
                </div>
              )}

              {tagSuggestions.length > 0 && (
                <div className="suggestion-group">
                  <div className="suggestion-heading">Popular tags for matching games</div>
                  {tagSuggestions.map(({ tag, count }) => (
                    <button
                      key={tag}
                      type="button"
                      className="suggestion-item"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSearchSuggestion(tag);
                      }}
                      role="option"
                      aria-selected={query === tag}
                    >
                      <span>#{tag}</span>
                      <small>{count} quest{count === 1 ? "" : "s"}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="board-games-dropdown"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setShowGameMenu(false);
            }
          }}
        >
          <button
            type="button"
            className="board-games-tab"
            onClick={() => setShowGameMenu((open) => !open)}
            aria-expanded={showGameMenu}
            aria-controls="quest-games-menu"
          >
            Games
            <span>{gameItems.length}</span>
          </button>

          {showGameMenu && (
            <div className="board-games-menu" id="quest-games-menu" role="listbox">
              <button
                type="button"
                className="board-game-item board-game-item--all"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setSearch("");
                  setShowSearchSuggestions(false);
                  setShowGameMenu(false);
                }}
                role="option"
                aria-selected={!search}
              >
                <span>All</span>
                <small>{quests.length} quest{quests.length === 1 ? "" : "s"}</small>
              </button>

              {gameItems.map(({ game, count }) => (
                <button
                  key={game}
                  type="button"
                  className="board-game-item"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSearch(game);
                    setShowSearchSuggestions(false);
                    setShowGameMenu(false);
                  }}
                  role="option"
                  aria-selected={search === game}
                >
                  <span>{game}</span>
                  <small>{count} quest{count === 1 ? "" : "s"}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="filter-tabs" aria-label="Quest filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-tab ${filter === f.key ? "filter-tab--active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quest grid */}
      {filtered.length === 0 ? (
        <div className="board-empty">
          <TrendingUp size={32} className="empty-icon" />
          <p>No quests found.</p>
          <Link to="/post" className="btn-post-quest" style={{ marginTop: 16 }}>Post the first one</Link>
        </div>
      ) : (
        <div className="quest-grid">
          {filtered.map((q, i) => (
            <QuestCard key={q.id} quest={q} delay={i * 60} />
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeSearch(value) {
  return value.trim().replace(/^#/, "").toLowerCase();
}
