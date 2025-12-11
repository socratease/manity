import React, { useState, useRef, useEffect } from "react";
import { Download, Upload, Mail, User, Database, RefreshCw, Save, X } from "lucide-react";

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
            <X size={18} />
          </button>
        </div>

        {/* Logged In User Section */}
        {loggedInUser !== undefined && allStakeholders && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <User size={18} style={styles.sectionIcon} />
              <h3 style={styles.sectionTitle}>Identity</h3>
            </div>
            <p style={styles.description}>
              Select who you are to personalize your view.
            </p>
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
        )}

        {/* Import/Export Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <Database size={18} style={styles.sectionIcon} />
            <h3 style={styles.sectionTitle}>Portfolio Data</h3>
          </div>
          <p style={styles.description}>
            Export or import portfolio data as JSON.
          </p>

          <div style={styles.compactRow}>
            <select
              value={exportTarget}
              onChange={(e) => setExportTarget(e.target.value)}
              style={styles.selectCompact}
            >
              <option value="all">All projects</option>
              {projects && projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button onClick={handleExport} style={styles.iconButtonCompact}>
              <Download size={14} />
              Export
            </button>
            <button onClick={handleImportClick} style={styles.iconButtonCompact}>
              <Upload size={14} />
              Import
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
            <div style={styles.sectionHeader}>
              <Mail size={18} style={styles.sectionIcon} />
              <h3 style={styles.sectionTitle}>Email Server</h3>
            </div>
            <p style={styles.description}>
              SMTP settings for AI-sent emails. Stored locally in this browser only.
            </p>

            <div style={styles.compactGrid}>
              <div style={styles.gridItem2}>
                <label style={styles.labelSmall} htmlFor="smtp-server">Server</label>
                <input
                  id="smtp-server"
                  type="text"
                  value={emailForm.smtpServer}
                  onChange={(e) => updateEmailField('smtpServer', e.target.value)}
                  style={styles.inputSmall}
                  placeholder="smtp.example.com"
                />
              </div>
              <div style={styles.gridItem1}>
                <label style={styles.labelSmall} htmlFor="smtp-port">Port</label>
                <input
                  id="smtp-port"
                  type="number"
                  value={emailForm.smtpPort}
                  onChange={(e) => updateEmailField('smtpPort', Number(e.target.value) || 0)}
                  style={styles.inputSmall}
                  min={1}
                />
              </div>
            </div>

            <div style={styles.compactGrid}>
              <div style={styles.gridItem1}>
                <label style={styles.labelSmall} htmlFor="smtp-username">Username</label>
                <input
                  id="smtp-username"
                  type="text"
                  value={emailForm.username}
                  onChange={(e) => updateEmailField('username', e.target.value)}
                  style={styles.inputSmall}
                  placeholder="user@example.com"
                />
              </div>
              <div style={styles.gridItem1}>
                <label style={styles.labelSmall} htmlFor="smtp-password">Password</label>
                <input
                  id="smtp-password"
                  type="password"
                  value={emailForm.password}
                  onChange={(e) => updateEmailField('password', e.target.value)}
                  style={styles.inputSmall}
                  placeholder={emailSettings?.hasPassword ? '••••••••' : 'Password'}
                />
              </div>
            </div>

            <div style={styles.compactGrid}>
              <div style={styles.gridItem2}>
                <label style={styles.labelSmall} htmlFor="smtp-from">From address</label>
                <input
                  id="smtp-from"
                  type="email"
                  value={emailForm.fromAddress}
                  onChange={(e) => updateEmailField('fromAddress', e.target.value)}
                  style={styles.inputSmall}
                  placeholder="alerts@example.com"
                />
              </div>
              <div style={styles.gridItem1}>
                <label style={styles.labelSmall}>&nbsp;</label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={emailForm.useTLS}
                    onChange={(e) => updateEmailField('useTLS', e.target.checked)}
                    style={styles.checkbox}
                  />
                  STARTTLS
                </label>
              </div>
            </div>

            <div style={styles.actionsRow}>
              <button onClick={handleSaveEmail} style={styles.saveButton} disabled={isSavingEmail}>
                <Save size={14} />
                {isSavingEmail ? 'Saving…' : 'Save'}
              </button>
              {onRefreshEmailSettings && (
                <button onClick={handleRefreshEmail} style={styles.refreshButton} title="Reload from browser storage">
                  <RefreshCw size={14} />
                </button>
              )}
              {emailStatus && <span style={styles.statusText}>{emailStatus}</span>}
            </div>
            <p style={styles.helperText}>Settings are stored in this browser only - not shared across devices.</p>
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    zIndex: 1000,
  },
  modal: {
    width: "min(480px, 100%)",
    maxHeight: "90vh",
    overflow: "auto",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: "20px",
    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.15)",
    fontFamily: "'Inter', sans-serif",
    color: "#3a3631",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1px solid #e8e3d8",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
    letterSpacing: "-0.3px",
    color: "#3a3631",
  },
  closeButton: {
    width: 28,
    height: 28,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#6b6554",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    transition: "background-color 0.15s ease",
  },
  section: {
    marginBottom: 16,
    padding: "12px",
    backgroundColor: "#faf8f3",
    borderRadius: 8,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  sectionIcon: {
    color: "#8b6f47",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 600,
    letterSpacing: "-0.2px",
    color: "#3a3631",
  },
  description: {
    fontSize: "12px",
    color: "#6b6554",
    margin: "0 0 10px 0",
    lineHeight: 1.5,
  },
  select: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #e8e3d8",
    fontSize: "13px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    color: "#3a3631",
  },
  selectCompact: {
    flex: 1,
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid #e8e3d8",
    fontSize: "12px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    color: "#3a3631",
  },
  compactRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  iconButtonCompact: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #e8e3d8",
    backgroundColor: "#ffffff",
    color: "#6b6554",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: "12px",
    transition: "all 0.15s ease",
  },
  hiddenFileInput: {
    display: "none",
  },
  compactGrid: {
    display: "flex",
    gap: 8,
    marginBottom: 8,
  },
  gridItem1: {
    flex: 1,
  },
  gridItem2: {
    flex: 2,
  },
  labelSmall: {
    display: "block",
    fontSize: "11px",
    fontWeight: 500,
    color: "#6b6554",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  inputSmall: {
    width: "100%",
    padding: "7px 9px",
    borderRadius: 6,
    border: "1px solid #e8e3d8",
    fontSize: "13px",
    backgroundColor: "#ffffff",
    boxSizing: "border-box",
    color: "#3a3631",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 9px",
    borderRadius: 6,
    border: "1px solid #e8e3d8",
    fontSize: "12px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    color: "#6b6554",
  },
  checkbox: {
    margin: 0,
  },
  actionsRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginTop: 12,
  },
  saveButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    borderRadius: 6,
    border: "none",
    background: "linear-gradient(135deg, #7a9b76 0%, #8b6f47 100%)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "12px",
    transition: "opacity 0.15s ease",
  },
  refreshButton: {
    width: 28,
    height: 28,
    padding: 0,
    borderRadius: 6,
    border: "1px solid #e8e3d8",
    backgroundColor: "#ffffff",
    color: "#6b6554",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
  },
  statusText: {
    fontSize: "12px",
    color: "#7a9b76",
    fontWeight: 500,
  },
  helperText: {
    fontSize: "11px",
    color: "#8b6f47",
    marginTop: 8,
    fontStyle: "italic",
  }
};
