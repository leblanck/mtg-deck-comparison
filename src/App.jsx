import { useState } from "react";

const BASIC_LANDS = new Set(["Plains", "Mountain", "Swamp", "Forest", "Island"]);
const DELAY = 80;
const delay = ms => new Promise(r => setTimeout(r, ms));
// Gruvbox accent colors for deck tags (work on both dark + light)
const DECK_COLORS = ["#458588","#d79921","#98971a","#cc241d","#b16286","#689d6a","#d65d0e","#83a598"];

function parseDecklist(text) {
  const cards = new Set();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.toLowerCase().startsWith("sideboard")) continue;
    const match = trimmed.match(/^\d+\s+(.+)$/);
    const name = match ? match[1].trim() : (!trimmed.match(/^\d+$/) ? trimmed : null);
    if (name && !BASIC_LANDS.has(name)) cards.add(name);
  }
  return cards;
}

function findDuplicates(decks) {
  const cardMap = {};
  for (const deck of decks) {
    for (const card of deck.cards) {
      if (!cardMap[card]) cardMap[card] = [];
      cardMap[card].push(deck.name);
    }
  }
  return Object.entries(cardMap)
    .filter(([, d]) => d.length > 1)
    .map(([name, deckList]) => ({ name, decks: deckList, count: deckList.length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

async function fetchPrice(cardName) {
  try {
    const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
    const data = await res.json();
    return data.prices?.usd ? parseFloat(data.prices.usd) : null;
  } catch { return null; }
}

const themes = {
  dark: {
    bg: "#282828", surface: "#3c3836", border: "#504945",
    text: "#ebdbb2", muted: "#a89984", faint: "#665c54",
    heading: "#fbf1c7", rowAlt: "#32302f", rowBase: "#282828",
    navBg: "#1d2021", navBorder: "#504945", footerBorder: "#504945",
    inputBg: "#1d2021", inputText: "#ebdbb2", link: "#83a598",
    toggleBg: "#504945", toggleKnob: "#a89984",
    accent: "#d79921", green: "#98971a", red: "#cc241d", blue: "#458588", purple: "#b16286", aqua: "#689d6a", orange: "#d65d0e",
  },
  light: {
    bg: "#fbf1c7", surface: "#f2e5bc", border: "#d5c4a1",
    text: "#3c3836", muted: "#7c6f64", faint: "#a89984",
    heading: "#282828", rowAlt: "#f9f5d7", rowBase: "#fbf1c7",
    navBg: "#f2e5bc", navBorder: "#d5c4a1", footerBorder: "#d5c4a1",
    inputBg: "#fbf1c7", inputText: "#3c3836", link: "#076678",
    toggleBg: "#d79921", toggleKnob: "#fbf1c7",
    accent: "#d79921", green: "#79740e", red: "#9d0006", blue: "#076678", purple: "#8f3f71", aqua: "#427b58", orange: "#af3a03",
  }
};

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [page, setPage] = useState("home");
  const [deckInputs, setDeckInputs] = useState([
    { id: 1, name: "Deck 1", text: "" },
    { id: 2, name: "Deck 2", text: "" },
  ]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sortCol, setSortCol] = useState("count");
  const [sortDir, setSortDir] = useState("desc");
  const [showInput, setShowInput] = useState(true);

  const t = isDark ? themes.dark : themes.light;

  const addDeck = () => setDeckInputs(prev => [...prev, { id: Date.now(), name: `Deck ${prev.length + 1}`, text: "" }]);
  const removeDeck = id => setDeckInputs(prev => prev.filter(d => d.id !== id));
  const updateDeck = (id, field, val) => setDeckInputs(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d));

  const analyze = async () => {
    const decks = deckInputs.filter(d => d.text.trim()).map(d => ({ name: d.name || `Deck ${d.id}`, cards: parseDecklist(d.text) }));
    if (decks.length < 2) return alert("Please enter at least 2 decks.");
    const dupes = findDuplicates(decks);
    if (dupes.length === 0) { setResults({ decks, dupes: [], prices: {} }); setShowInput(false); return; }
    setLoading(true); setProgress(0); setShowInput(false);
    const prices = {};
    for (let i = 0; i < dupes.length; i++) {
      prices[dupes[i].name] = await fetchPrice(dupes[i].name);
      setProgress(i + 1);
      await delay(DELAY);
    }
    setResults({ decks, dupes, prices });
    setLoading(false);
  };

  const reset = () => { setResults(null); setShowInput(true); };
  const toggleSort = col => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir(col === "price" || col === "count" ? "desc" : "asc"); }
  };
  const arrow = col => sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕";
  const sorted = results ? [...results.dupes].sort((a, b) => {
    if (sortCol === "price") { const va = results.prices[a.name] ?? -1, vb = results.prices[b.name] ?? -1; return sortDir === "asc" ? va - vb : vb - va; }
    if (sortCol === "count") return sortDir === "asc" ? a.count - b.count : b.count - a.count;
    if (sortCol === "name") return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    return 0;
  }) : [];
  const totalValue = results ? results.dupes.reduce((s, r) => s + (results.prices[r.name] ?? 0), 0) : 0;
  const deckColor = (deckName, decks) => DECK_COLORS[decks.findIndex(d => d.name === deckName) % DECK_COLORS.length];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: t.bg, minHeight: "100vh", color: t.text, display: "flex", flexDirection: "column" }}>

      {/* NAV */}
      <nav style={{ background: t.navBg, borderBottom: `1px solid ${t.navBorder}`, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: t.heading }}>🃏 MTG Deck Comparison</span>
          <div style={{ display: "flex", gap: 4 }}>
            {["home","about"].map(p => (
              <button key={p} onClick={() => setPage(p)} style={{ background: page === p ? (isDark ? "#334155" : "#f1f5f9") : "transparent", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontWeight: page === p ? 700 : 400, color: page === p ? t.heading : t.muted, fontSize: 14, textTransform: "capitalize" }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        {/* Theme toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: t.muted }}>{isDark ? "Dark" : "Light"}</span>
          <div onClick={() => setIsDark(d => !d)} style={{ width: 44, height: 24, borderRadius: 12, background: t.toggleBg, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: 3, left: isDark ? 3 : 23, width: 18, height: 18, borderRadius: "50%", background: t.toggleKnob, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </div>
          <span style={{ fontSize: 16 }}>{isDark ? "🌙" : "☀️"}</span>
        </div>
      </nav>

      {/* MAIN */}
      <main style={{ flex: 1, padding: 20 }}>

        {page === "about" && (
          <div style={{ maxWidth: 680 }}>
            <h2 style={{ color: t.heading, marginTop: 0 }}>About MTG Deck Finder</h2>
            <p style={{ color: t.text, lineHeight: 1.7 }}>MTG Deck Finder is a free tool that helps Magic: The Gathering players identify cards that appear across multiple decks. Simply paste in two or more decklists, and the app will highlight every card that shows up in more than one deck — along with the current market price sourced from Scryfall.</p>
            <h3 style={{ color: t.heading }}>How to use it</h3>
            <ol style={{ color: t.text, lineHeight: 2 }}>
              <li>Paste each decklist into its own text box on the Home page.</li>
              <li>Give each deck a name.</li>
              <li>Click <strong>Find Duplicates & Prices</strong>.</li>
              <li>Review the results table — sortable by card name, number of decks, or price.</li>
            </ol>
            <h3 style={{ color: t.heading }}>Decklist format</h3>
            <p style={{ color: t.text, lineHeight: 1.7 }}>The app expects one card per line in the format <code style={{ background: t.surface, padding: "1px 6px", borderRadius: 4 }}>1 Card Name</code>. Basic lands and SIDEBOARD sections are automatically ignored.</p>
            <h3 style={{ color: t.heading }}>Pricing</h3>
            <p style={{ color: t.text, lineHeight: 1.7 }}>Prices are fetched in real time from the <a href="https://scryfall.com/docs/api" target="_blank" rel="noreferrer" style={{ color: t.link }}>Scryfall API</a> and reflect the TCGPlayer market price for non-foil, near mint copies.</p>
          </div>
        )}

        {page === "home" && (
          <div>
            <h2 style={{ margin: "0 0 4px", color: t.heading, fontSize: 22 }}>Duplicate Card Finder</h2>
            <p style={{ margin: "0 0 20px", color: t.muted, fontSize: 14 }}>Paste in your decklists, find cards shared across decks, and look up market prices.</p>

            {showInput && (
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {deckInputs.map((deck, i) => (
                    <div key={deck.id} style={{ background: t.surface, borderRadius: 10, padding: 14, borderLeft: `4px solid ${DECK_COLORS[i % DECK_COLORS.length]}` }}>
                      <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
                        <input value={deck.name} onChange={e => updateDeck(deck.id, "name", e.target.value)} placeholder="Deck name"
                          style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 6, padding: "6px 10px", color: t.inputText, fontSize: 14, fontWeight: 600, flex: 1 }} />
                        {deckInputs.length > 2 && (
                          <button onClick={() => removeDeck(deck.id)} style={{ background: "#ef4444", border: "none", borderRadius: 6, color: "#fff", padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>✕ Remove</button>
                        )}
                      </div>
                      <textarea value={deck.text} onChange={e => updateDeck(deck.id, "text", e.target.value)}
                        placeholder={`Paste decklist here...\n\nFormat: "1 Card Name" per line\nSIDEBOARD lines are ignored`}
                        rows={8} style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 6, padding: "8px 10px", color: t.inputText, fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "monospace" }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button onClick={addDeck} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.muted, padding: "10px 18px", cursor: "pointer", fontSize: 14 }}>+ Add Deck</button>
                  <button onClick={analyze} style={{ background: t.accent, border: "none", borderRadius: 8, color: "#282828", padding: "10px 24px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>🔍 Find Duplicates & Prices</button>
                </div>
              </div>
            )}

            {loading && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: t.muted, marginBottom: 6 }}>
                  <span>Fetching prices from Scryfall...</span>
                  <span>{progress} / {results?.dupes.length ?? "?"}</span>
                </div>
                  <div style={{ background: t.surface, borderRadius: 6, height: 8 }}>
                    <div style={{ background: t.accent, height: 8, borderRadius: 6, width: `${results ? (progress / results.dupes.length) * 100 : 0}%`, transition: "width 0.2s" }} />
                  </div>
              </div>
            )}

            {!loading && results && (
              <div>
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                  {[["Duplicate Cards", results.dupes.length, t.heading], ["Total Market Value", `${totalValue.toFixed(2)}`, t.green], ["Decks Compared", results.decks.length, t.blue]].map(([label, val, color]) => (
                    <div key={label} style={{ background: t.surface, borderRadius: 8, padding: "10px 18px", flex: 1, minWidth: 130 }}>
                      <div style={{ fontSize: 12, color: t.muted }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
                    </div>
                  ))}
                  <button onClick={reset} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, padding: "10px 18px", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>← Edit Decks</button>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  {results.decks.map((d, i) => (
                    <span key={d.name} style={{ background: DECK_COLORS[i % DECK_COLORS.length] + "22", border: `1px solid ${DECK_COLORS[i % DECK_COLORS.length]}`, borderRadius: 20, padding: "3px 12px", fontSize: 13, color: DECK_COLORS[i % DECK_COLORS.length], fontWeight: 600 }}>{d.name}</span>
                  ))}
                </div>

                {results.dupes.length === 0 ? (
                  <div style={{ background: t.surface, borderRadius: 10, padding: 30, textAlign: "center", color: t.faint }}>No duplicate cards found across decks.</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: t.surface, color: t.muted }}>
                          {[["name","Card Name"],["decks","Appears In"],["count","# Decks"],["price","Market Price"]].map(([col, label]) => (
                            <th key={col} onClick={() => toggleSort(col)} style={{ padding: "10px 12px", textAlign: "left", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>{label}{arrow(col)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((r, i) => (
                          <tr key={r.name} style={{ background: i % 2 === 0 ? t.rowBase : t.rowAlt, borderBottom: `1px solid ${t.border}` }}>
                            <td style={{ padding: "9px 12px", fontWeight: 600, color: t.heading }}>{r.name}</td>
                            <td style={{ padding: "9px 12px" }}>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {r.decks.map(dn => (
                                  <span key={dn} style={{ background: deckColor(dn, results.decks) + "33", border: `1px solid ${deckColor(dn, results.decks)}`, borderRadius: 12, padding: "2px 9px", fontSize: 12, color: deckColor(dn, results.decks), fontWeight: 600 }}>{dn}</span>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: "9px 12px" }}>
                              <span style={{ background: r.count >= 3 ? t.purple : t.blue, color: "#fbf1c7", borderRadius: 9, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>{r.count}</span>
                            </td>
                            <td style={{ padding: "9px 12px", fontWeight: 700, color: results.prices[r.name] != null ? (results.prices[r.name] >= 5 ? t.orange : t.green) : t.faint }}>
                              {results.prices[r.name] != null ? `$${results.prices[r.name].toFixed(2)}` : "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{ padding: "16px 20px", borderTop: `1px solid ${t.footerBorder}`, color: t.faint, fontSize: 12, lineHeight: 1.6 }}>
        Card prices are sourced from the <a href="https://scryfall.com/docs/api" target="_blank" rel="noreferrer" style={{ color: t.link }}>Scryfall API</a> and reflect the current TCGPlayer market price for non-foil, near mint copies. Prices are fetched in real time and may not reflect the most recent market changes. This app is not affiliated with or endorsed by Scryfall or Wizards of the Coast. Magic: The Gathering card names and set information are property of Wizards of the Coast LLC.
        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
          <span>Made with ♥ by <a href="https://leblanc.sh" target="_blank" rel="noreferrer" style={{ color: t.link }}>LeBlanc Engineering</a> in Maine.</span>
          <span>© {new Date().getFullYear()} LeBlanc Engineering. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}