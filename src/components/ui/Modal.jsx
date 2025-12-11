import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Modal/Dialog component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Close callback
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} props.title - Modal title
 * @param {string} props.maxWidth - Max width (default '420px')
 * @param {boolean} props.showCloseButton - Show X button in header
 * @param {Object} props.style - Additional inline styles for modal
 */
const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  maxWidth = '420px',
  showCloseButton = true,
  style = {},
}) => {
  const modalRef = useRef(null);

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
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const backdropStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(58, 54, 49, 0.3)',
    backdropFilter: 'blur(2px)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    animation: 'fadeIn 0.2s ease',
  };

  const modalStyle = {
    width: '100%',
    maxWidth: maxWidth,
    maxHeight: '90vh',
    overflow: 'auto',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    animation: 'scaleIn 0.25s ease',
    border: '1px solid #E8E3D8',
    ...style,
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #E8E3D8',
    backgroundColor: '#FAF8F3',
  };

  const titleStyle = {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif",
  };

  const closeButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    border: 'none',
    background: 'transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#6B6554',
    transition: 'all 0.2s ease',
  };

  const contentStyle = {
    padding: '20px',
  };

  return (
    <div style={backdropStyle}>
      <div ref={modalRef} style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {(title || showCloseButton) && (
          <div style={headerStyle}>
            {title && <h3 style={titleStyle}>{title}</h3>}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                style={closeButtonStyle}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div style={contentStyle}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
