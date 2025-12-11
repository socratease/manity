import React from 'react';

/**
 * Reusable StatCard component for displaying statistics
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon component
 * @param {number|string} props.value - Stat value
 * @param {string} props.label - Stat label
 * @param {string} props.color - Icon color
 * @param {Object} props.style - Additional inline styles
 */
const StatCard = ({
  icon,
  value,
  label,
  color = '#8B6F47',
  style = {},
}) => {
  const cardStyle = {
    backgroundColor: '#FFFFFF',
    padding: '12px 8px',
    textAlign: 'center',
    ...style,
  };

  const iconStyle = {
    color: color,
    marginBottom: '4px',
  };

  const valueStyle = {
    fontSize: '18px',
    fontWeight: '700',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif",
  };

  const labelStyle = {
    fontSize: '10px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  return (
    <div style={cardStyle}>
      {icon && React.cloneElement(icon, { size: 16, style: iconStyle })}
      <div style={valueStyle}>{value}</div>
      <div style={labelStyle}>{label}</div>
    </div>
  );
};

export default StatCard;
