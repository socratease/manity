import React from "react";

export default function SettingsModal({
  isOpen,
  tempKey,
  hasStoredKey,
  onTempKeyChange,
  onSave,
  onClear,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div
      style={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={onClose}
    >
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 id="settings-title" style={styles.title}>
            API key
          </h2>
          <button onClick={onClose} style={styles.closeButton} aria-label="Close settings">
            ×
          </button>
        </div>

        <p style={styles.description}>
          Your API key is stored only in this browser (localStorage) and is sent only to the model provider when you explicitly make a
          request. It is never sent to GitHub or any other server.
        </p>

        <input
          type="password"
          value={tempKey}
          onChange={(e) => onTempKeyChange(e.target.value)}
          placeholder="Paste your OpenAI API key"
          style={styles.input}
        />

        <div style={styles.actions}>
          <button onClick={onSave} style={styles.primaryButton}>
            Save
          </button>
          {hasStoredKey && (
            <button onClick={onClear} type="button" style={styles.secondaryButton}>
              Clear stored key
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    zIndex: 20,
  },
  modal: {
    width: "min(520px, 100%)",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: "24px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.12)",
    border: "1px solid #e8e3d8",
    fontFamily: "'Inter', sans-serif",
    color: "#3a3631",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 600,
    letterSpacing: "-0.25px",
  },
  closeButton: {
    border: "none",
    background: "transparent",
    fontSize: "20px",
    cursor: "pointer",
    color: "#6b6554",
    lineHeight: 1,
    padding: 6,
    borderRadius: 8,
  },
  description: {
    fontSize: "14px",
    color: "#6b6554",
    margin: "0 0 12px 0",
    lineHeight: 1.6,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e8e3d8",
    fontSize: "14px",
    marginBottom: 12,
    backgroundColor: "#faf8f3",
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  primaryButton: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #7a9b76 0%, #8b6f47 100%)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    letterSpacing: "0.2px",
  },
  secondaryButton: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid #e8e3d8",
    backgroundColor: "#fff",
    color: "#6b6554",
    cursor: "pointer",
    fontWeight: 500,
  },
};
