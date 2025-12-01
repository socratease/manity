import React, { useState, useEffect } from "react";
import ManityApp from "./ManityApp";
import { useApiKey } from "./hooks/useApiKey";

export default function App() {
  const { apiKey, setApiKey, clearApiKey, hasStoredKey } = useApiKey();
  const [tempKey, setTempKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (apiKey) {
      setTempKey("********");
    }
  }, [apiKey]);

  const handleSave = () => {
    if (tempKey && tempKey !== "********") {
      setApiKey(tempKey.trim());
    }
    setShowSettings(false);
  };

  const handleClear = () => {
    clearApiKey();
    setTempKey("");
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem" }}>
      {showSettings && (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "1rem",
            marginBottom: "1.5rem",
            background: "#fafafa",
            position: "relative",
          }}
        >
          <button
            onClick={() => setShowSettings(false)}
            style={{ position: "absolute", top: 12, right: 12 }}
            aria-label="Close settings"
          >
            Close
          </button>
          <h2>API key</h2>
          <p style={{ fontSize: "0.9rem" }}>
            Your API key is stored only in this browser (localStorage) and is sent only to the model provider when you explicitly make a
            request. It is never sent to GitHub or any other server.
          </p>
          <input
            type="password"
            value={tempKey}
            onChange={(e) => setTempKey(e.target.value)}
            placeholder="Paste your OpenAI API key"
            style={{ width: "100%", marginBottom: 8, padding: 6 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave}>Save</button>
            {hasStoredKey && (
              <button onClick={handleClear} type="button">
                Clear stored key
              </button>
            )}
          </div>
        </section>
      )}

      <main>
        <ManityApp onOpenSettings={() => setShowSettings(true)} />
      </main>
    </div>
  );
}
