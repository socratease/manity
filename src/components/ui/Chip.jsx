import React from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Chip/Tag component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Chip content
 * @param {React.ReactNode} props.icon - Icon to display before content
 * @param {string} props.color - Background/accent color
 * @param {'sm' | 'md'} props.size - Chip size
 * @param {boolean} props.removable - Show remove button
 * @param {Function} props.onRemove - Remove callback
 * @param {Function} props.onClick - Click callback
 * @param {Object} props.style - Additional inline styles
 */
const Chip = ({
  children,
  icon,
  color = '#8B6F47',
  size = 'md',
  removable = false,
  onRemove,
  onClick,
  style = {},
}) => {
  const sizeConfig = {
    sm: {
      padding: '4px 8px',
      fontSize: '12px',
      iconSize: 10,
      gap: '4px',
    },
    md: {
      padding: '6px 10px 6px 6px',
      fontSize: '13px',
      iconSize: 12,
      gap: '6px',
    },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: config.gap,
    padding: config.padding,
    backgroundColor: `${color}15`,
    color: color,
    borderRadius: '20px',
    fontSize: config.fontSize,
    fontWeight: '500',
    fontFamily: "'Inter', sans-serif",
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
    ...style,
  };

  const removeButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '4px',
    padding: '2px',
    background: `${color}30`,
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    color: color,
  };

  return (
    <div style={chipStyle} onClick={onClick}>
      {icon && React.cloneElement(icon, { size: config.iconSize })}
      {children}
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={removeButtonStyle}
          aria-label="Remove"
        >
          <X size={config.iconSize} />
        </button>
      )}
    </div>
  );
};

export default Chip;
