import React from 'react';

/**
 * Reusable FormSelect component with label and dropdown
 *
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {string} props.value - Selected value
 * @param {Function} props.onChange - Change handler
 * @param {Array} props.options - Array of { value, label } options
 * @param {boolean} props.disabled - Disable the select
 * @param {Object} props.style - Additional inline styles for container
 * @param {Object} props.selectStyle - Additional inline styles for select
 */
const FormSelect = ({
  label,
  value,
  onChange,
  options = [],
  disabled = false,
  style = {},
  selectStyle = {},
  ariaLabel,
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

  const baseSelectStyle = {
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
    cursor: 'pointer',
    opacity: disabled ? 0.6 : 1,
    ...selectStyle,
  };

  return (
    <div style={containerStyle}>
      {label && (
        <label style={labelStyle}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={baseSelectStyle}
        aria-label={ariaLabel || label}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FormSelect;
