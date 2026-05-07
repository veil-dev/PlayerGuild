// src/pages/QuestBoard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, Sword, TrendingUp } from "lucide-react";
import { useQuestStore } from "../contexts/QuestStore";
import QuestCard from "../components/QuestCard";
import StatsBar from "../components/StatsBar";
import "./QuestBoard.css";

const FILTERS = [
  { key: "all",       label: "All Quests" },
  { key: "open",      label: "Open" },
  { key: "claimed",   label: "In Progress" },
  { key: "completed", label: "Completed" },
];

export default function QuestBoard() {
  const { quests, filter, setFilter, getFiltered, loadQuests, loaded } = useQuestStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loaded) loadQuests();
  }, [loaded, loadQuests]);

  const filtered = getFiltered().filter((q) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.title.toLowerCase().includes(s) ||
      q.game.toLowerCase().includes(s) ||
      q.description.toLowerCase().includes(s) ||
      q.tags?.some((t) => t.toLowerCase().includes(s))
    );
  });

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
            Trustless gig escrow for gamers — powered by Stellar Soroban
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
          />
        </div>

        <div className="filter-tabs">
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
