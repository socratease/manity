import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, X, Check } from 'lucide-react';

/**
 * Modern callout/popover for adding a new person
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the callout is visible
 * @param {Function} props.onClose - Callback to close the callout
 * @param {Function} props.onSave - Callback when person is saved (person) => void
 * @param {string} props.initialName - Pre-filled name (optional)
 * @param {Object} props.anchorPosition - Position to anchor the callout { top, left } (optional)
 */
const AddPersonCallout = ({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  anchorPosition = null
}) => {
  const [name, setName] = useState(initialName);
  const [team, setTeam] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const calloutRef = useRef(null);
  const nameInputRef = useRef(null);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setTeam('');
      setEmail('');
      setProfilePicture('');
      setIsSubmitting(false);
      // Focus the first input
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [isOpen, initialName]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calloutRef.current && !calloutRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      // Delay to prevent immediate closing when opening
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !team.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        team: team.trim(),
        email: email.trim() || undefined,
        profilePicture: profilePicture.trim() || undefined
      });
      onClose();
    } catch (error) {
      console.error('Error saving person:', error);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Calculate position
  const calloutStyle = anchorPosition
    ? {
        ...styles.callout,
        position: 'fixed',
        top: `${anchorPosition.top}px`,
        left: `${anchorPosition.left}px`,
        transform: 'translateY(8px)'
      }
    : styles.callout;

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} />

      {/* Callout */}
      <div ref={calloutRef} style={calloutStyle}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <UserPlus size={18} style={styles.headerIcon} />
            <h3 style={styles.title}>Add New Person</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeButton}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Name <span style={styles.required}>*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sarah Chen"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Team <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="e.g., Engineering"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@company.com (optional)"
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Profile picture URL</label>
            <input
              type="url"
              value={profilePicture}
              onChange={(e) => setProfilePicture(e.target.value)}
              placeholder="https://... (optional)"
              style={styles.input}
            />
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...styles.saveButton,
                ...((!name.trim() || !team.trim() || isSubmitting) ? styles.saveButtonDisabled : {})
              }}
              disabled={!name.trim() || !team.trim() || isSubmitting}
            >
              <Check size={16} />
              {isSubmitting ? 'Adding...' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(58, 54, 49, 0.3)',
    backdropFilter: 'blur(2px)',
    zIndex: 999,
    animation: 'fadeIn 0.2s ease'
  },
  callout: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    maxWidth: '420px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    animation: 'slideIn 0.25s ease',
    border: '1px solid var(--cloud)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--cloud)',
    backgroundColor: 'var(--cream)'
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  headerIcon: {
    color: 'var(--earth)'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--charcoal)'
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    border: 'none',
    background: 'transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--stone)',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'var(--cloud)',
      color: 'var(--charcoal)'
    }
  },
  form: {
    padding: '20px'
  },
  fieldGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--charcoal)'
  },
  required: {
    color: 'var(--coral)'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--charcoal)',
    backgroundColor: 'var(--cream)',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
    '&:focus': {
      borderColor: 'var(--earth)',
      backgroundColor: 'white'
    }
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid var(--cloud)'
  },
  cancelButton: {
    padding: '8px 16px',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: 'var(--stone)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    '&:hover': {
      backgroundColor: 'var(--cream)',
      borderColor: 'var(--stone)'
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'var(--earth)',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    '&:hover': {
      backgroundColor: '#7a5f3d'
    }
  },
  saveButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    '&:hover': {
      backgroundColor: 'var(--earth)'
    }
  }
};

// Add keyframe animations via a style tag
if (typeof document !== 'undefined' && !document.getElementById('add-person-callout-styles')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'add-person-callout-styles';
  styleTag.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translate(-50%, -48%) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
  `;
  document.head.appendChild(styleTag);
}

export default AddPersonCallout;
