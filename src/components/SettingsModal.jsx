import React, { useState, useRef, useEffect } from "react";
import { Download, Upload } from "lucide-react";

export default function SettingsModal({
  isOpen,
  onClose,
  onExport,
  onImport,
  projects,
  loggedInUser,
  setLoggedInUser,
  allStakeholders,
  emailSettings,
  onSaveEmailSettings,
  onRefreshEmailSettings,
}) {
  const [exportTarget, setExportTarget] = useState("all");
  const importInputRef = useRef(null);
  const [emailForm, setEmailForm] = useState({
    smtpServer: "",
    smtpPort: 587,
    username: "",
    password: "",
    fromAddress: "",
    useTLS: true
  });
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");

  useEffect(() => {
    if (!emailSettings) return;
    setEmailForm({
      smtpServer: emailSettings.smtpServer || "",
      smtpPort: emailSettings.smtpPort || 587,
      username: emailSettings.username || "",
      password: "",
      fromAddress: emailSettings.fromAddress || "",
      useTLS: emailSettings.useTLS ?? true
    });
  }, [emailSettings]);

  if (!isOpen) return null;

  const handleExport = () => {
    if (exportTarget === "all") {
      onExport();
    } else {
      onExport(exportTarget);
    }
  };

  const handleImportClick = () => {
    if (importInputRef.current) {
      importInputRef.current.click();
    }
  };

  const handleImportChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await onImport(file);
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  };

  const updateEmailField = (field, value) => {
    setEmailForm(prev => ({ ...prev, [field]: value }));
    setEmailStatus('');
  };

  const handleSaveEmail = async () => {
    if (!onSaveEmailSettings) return;
    setIsSavingEmail(true);
    setEmailStatus('');
    try {
      await onSaveEmailSettings({ ...emailForm, password: emailForm.password || undefined });
      setEmailStatus('Email settings saved');
      setEmailForm(prev => ({ ...prev, password: '' }));
    } catch (error) {
      setEmailStatus(error?.message || 'Unable to save email settings');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleRefreshEmail = async () => {
    if (!onRefreshEmailSettings) return;
    setEmailStatus('');
    try {
      const data = await onRefreshEmailSettings();
      if (data) {
        setEmailForm(prev => ({ ...prev, password: '' }));
        setEmailStatus('Email settings refreshed');
      }
    } catch (error) {
      setEmailStatus(error?.message || 'Unable to refresh email settings');
    }
  };

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
            Settings
          </h2>
          <button onClick={onClose} style={styles.closeButton} aria-label="Close settings">
            ×
          </button>
        </div>

        {/* Logged In User Section */}
        {loggedInUser !== undefined && allStakeholders && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Logged in as</h3>
            <p style={styles.description}>
              Select which person you are to customize your view and track your activities.
            </p>
            <div style={styles.dataGroup}>
              <select
                value={loggedInUser}
                onChange={(e) => {
                  setLoggedInUser(e.target.value);
                  localStorage.setItem('manity_logged_in_user', e.target.value);
                }}
                style={styles.select}
                aria-label="Select logged in user"
              >
                {allStakeholders.map(stakeholder => (
                  <option key={stakeholder.name} value={stakeholder.name}>
                    {stakeholder.name} ({stakeholder.team})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Import/Export Section */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Portfolio data</h3>
          <p style={styles.description}>
            Export your portfolio to a JSON file or import data from a previously exported file.
          </p>

          {/* Export */}
          <div style={styles.dataGroup}>
            <label style={styles.label}>Export</label>
            <div style={styles.exportControls}>
              <select
                value={exportTarget}
                onChange={(e) => setExportTarget(e.target.value)}
                style={styles.select}
              >
                <option value="all">All projects</option>
                {projects && projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button onClick={handleExport} style={styles.iconButton}>
                <Download size={16} />
                Export
              </button>
            </div>
          </div>

          {/* Import */}
          <div style={styles.dataGroup}>
            <label style={styles.label}>Import</label>
            <button onClick={handleImportClick} style={styles.iconButton}>
              <Upload size={16} />
              Import from file
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportChange}
              style={styles.hiddenFileInput}
            />
          </div>
        </div>

        {/* Email Settings */}
        {onSaveEmailSettings && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Email server</h3>
            <p style={styles.description}>
              Configure the SMTP server Momentum should use when sending emails on your behalf.
            </p>

            <div style={styles.flexRow}>
              <div style={{ flex: 2 }}>
                <label style={styles.label} htmlFor="smtp-server">SMTP server</label>
                <input
                  id="smtp-server"
                  type="text"
                  value={emailForm.smtpServer}
                  onChange={(e) => updateEmailField('smtpServer', e.target.value)}
                  style={styles.input}
                  placeholder="smtp.example.com"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label} htmlFor="smtp-port">Port</label>
                <input
                  id="smtp-port"
                  type="number"
                  value={emailForm.smtpPort}
                  onChange={(e) => updateEmailField('smtpPort', Number(e.target.value) || 0)}
                  style={styles.input}
                  min={1}
                />
              </div>
            </div>

            <div style={styles.flexRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.label} htmlFor="smtp-username">Username</label>
                <input
                  id="smtp-username"
                  type="text"
                  value={emailForm.username}
                  onChange={(e) => updateEmailField('username', e.target.value)}
                  style={styles.input}
                  placeholder="bot@example.com"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label} htmlFor="smtp-password">Password</label>
                <input
                  id="smtp-password"
                  type="password"
                  value={emailForm.password}
                  onChange={(e) => updateEmailField('password', e.target.value)}
                  style={styles.input}
                  placeholder={emailSettings?.hasPassword ? '••••••••' : 'Enter password'}
                />
              </div>
            </div>

            <div style={styles.flexRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.label} htmlFor="smtp-from">From address</label>
                <input
                  id="smtp-from"
                  type="email"
                  value={emailForm.fromAddress}
                  onChange={(e) => updateEmailField('fromAddress', e.target.value)}
                  style={styles.input}
                  placeholder="alerts@example.com"
                />
              </div>
              <div style={{ ...styles.toggleRow, flex: 1 }}>
                <label style={styles.label} htmlFor="smtp-tls">Connection security</label>
                <div style={styles.toggleGroup}>
                  <input
                    id="smtp-tls"
                    type="checkbox"
                    checked={emailForm.useTLS}
                    onChange={(e) => updateEmailField('useTLS', e.target.checked)}
                  />
                  <span>Use STARTTLS</span>
                </div>
              </div>
            </div>

            <div style={styles.actions}>
              <button onClick={handleSaveEmail} style={styles.primaryButton} disabled={isSavingEmail}>
                {isSavingEmail ? 'Saving…' : 'Save email settings'}
              </button>
              {onRefreshEmailSettings && (
                <button onClick={handleRefreshEmail} style={styles.secondaryButton}>
                  Refresh from server
                </button>
              )}
              {emailStatus && <span style={styles.statusText}>{emailStatus}</span>}
            </div>
            <p style={styles.helperText}>Password is optional; leave blank to keep the existing secret.</p>
          </div>
        )}
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
    width: "min(580px, 100%)",
    maxHeight: "90vh",
    overflow: "auto",
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
    marginBottom: 20,
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    margin: "0 0 8px 0",
    fontSize: "16px",
    fontWeight: 600,
    letterSpacing: "-0.2px",
    color: "#3a3631",
  },
  divider: {
    height: 1,
    backgroundColor: "#e8e3d8",
    margin: "20px 0",
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
    boxSizing: "border-box",
  },
  select: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e8e3d8",
    fontSize: "14px",
    backgroundColor: "#faf8f3",
    cursor: "pointer",
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
  dataGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: 500,
    color: "#3a3631",
    marginBottom: 8,
  },
  exportControls: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  iconButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid #e8e3d8",
    backgroundColor: "#fff",
    color: "#6b6554",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: "14px",
  },
  hiddenFileInput: {
    display: "none",
  },
  flexRow: {
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
    marginBottom: 12,
    flexWrap: "wrap"
  },
  toggleRow: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    gap: 6
  },
  toggleGroup: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "10px 12px",
    border: "1px solid #e8e3d8",
    borderRadius: 10,
    backgroundColor: "#faf8f3",
  },
  statusText: {
    fontSize: "13px",
    color: "#6b6554",
    alignSelf: "center",
  },
  helperText: {
    fontSize: "13px",
    color: "#6b6554",
    marginTop: 8,
  }
};
