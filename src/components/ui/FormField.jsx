import React from 'react';

/**
 * Reusable FormField component with label and input
 *
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {boolean} props.required - Show required indicator
 * @param {string} props.type - Input type (text, email, password, etc.)
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.placeholder - Input placeholder
 * @param {boolean} props.disabled - Disable the input
 * @param {boolean} props.autoFocus - Auto focus on mount
 * @param {Object} props.style - Additional inline styles for container
 * @param {Object} props.inputStyle - Additional inline styles for input
 */
const FormField = ({
  label,
  required = false,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  autoFocus = false,
  style = {},
  inputStyle = {},
  inputRef,
  ...props
}) => {
  const containerStyle = {
    marginBottom: '16px',
    ...style,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif",
  };

  const requiredStyle = {
    color: '#D67C5C',
  };

  const baseInputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E8E3D8',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#3A3631',
    backgroundColor: '#FAF8F3',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
    opacity: disabled ? 0.6 : 1,
    ...inputStyle,
  };

  return (
    <div style={containerStyle}>
      {label && (
        <label style={labelStyle}>
          {label}
          {required && <span style={requiredStyle}> *</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        required={required}
        style={baseInputStyle}
        {...props}
      />
    </div>
  );
};

export default FormField;
