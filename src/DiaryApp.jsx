import React, { useState, useEffect } from "react";

// Helper to get today's date in YYYY-MM-DD
const getToday = () => new Date().toISOString().split('T')[0];

// Load entries from localStorage
const loadEntries = () => {
  try {
    const saved = localStorage.getItem("diaryEntries");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save entries to localStorage
const saveEntries = (entries) => {
  localStorage.setItem("diaryEntries", JSON.stringify(entries));
};

export default function DiaryApp() {
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState(getToday());
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  // Save to localStorage whenever entries change
  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (editingId) {
      setEntries(entries.map(entry =>
        entry.id === editingId ? { ...entry, date, text } : entry
      ));
      setEditingId(null);
    } else {
      setEntries([
        ...entries,
        { id: Date.now(), date, text }
      ]);
    }
    setText("");
    setDate(getToday());
  };

  const handleEdit = (id) => {
    const entry = entries.find(e => e.id === id);
    setDate(entry.date);
    setText(entry.text);
    setEditingId(id);
  };

  const handleDelete = (id) => {
    setEntries(entries.filter(e => e.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setText("");
      setDate(getToday());
    }
  };

  // Sort by date descending
  const sortedEntries = [...entries].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <div style={{ maxWidth: 500, margin: "auto", padding: 20 }}>
      <h2>Personal Diary</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          max={getToday()}
          required
        />
        <br />
        <textarea
          placeholder="Write your diary entry..."
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          style={{ width: "100%", marginTop: 8 }}
          required
        />
        <br />
        <button type="submit" style={{ marginTop: 8 }}>
          {editingId ? "Save Changes" : "Add Entry"}
        </button>
      </form>
      <hr />
      <h3>Entries</h3>
      {sortedEntries.length === 0 && <p>No diary entries yet.</p>}
      {sortedEntries.map(entry => (
        <div key={entry.id} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
          <strong>{entry.date}</strong>
          <p>{entry.text}</p>
          <button onClick={() => handleEdit(entry.id)}>Edit</button>
          <button onClick={() => handleDelete(entry.id)} style={{ marginLeft: 8 }}>Delete</button>
        </div>
      ))}
    </div>
  );
}