import React from 'react';

/**
 * Reusable IconLabel component for icon + text combinations
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon component
 * @param {string} props.label - Label text
 * @param {string} props.color - Icon color
 * @param {'sm' | 'md' | 'lg'} props.size - Size variant
 * @param {Object} props.style - Additional inline styles
 */
const IconLabel = ({
  icon,
  label,
  color = '#6B6554',
  size = 'md',
  style = {},
}) => {
  const sizeConfig = {
    sm: {
      fontSize: '11px',
      iconSize: 12,
      gap: '4px',
    },
    md: {
      fontSize: '13px',
      iconSize: 14,
      gap: '6px',
    },
    lg: {
      fontSize: '14px',
      iconSize: 16,
      gap: '8px',
    },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: config.gap,
    fontSize: config.fontSize,
    color: color,
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
    ...style,
  };

  return (
    <div style={containerStyle}>
      {icon && React.cloneElement(icon, { size: config.iconSize })}
      {label && <span>{label}</span>}
    </div>
  );
};

export default IconLabel;
