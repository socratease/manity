import React from 'react';

/**
 * Reusable SectionTitle component for section headers with icons
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon component
 * @param {string} props.title - Title text
 * @param {Object} props.style - Additional inline styles
 */
const SectionTitle = ({
  icon,
  title,
  style = {},
}) => {
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 0 12px 0',
    fontSize: '11px',
    fontWeight: '700',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    ...style,
  };

  return (
    <h4 style={containerStyle}>
      {icon && React.cloneElement(icon, { size: 14 })}
      {title}
    </h4>
  );
};

export default SectionTitle;
