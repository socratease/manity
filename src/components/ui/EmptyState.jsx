import React from 'react';

/**
 * Reusable EmptyState component for no-data states
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon to display
 * @param {string} props.title - Title text
 * @param {string} props.description - Description text
 * @param {React.ReactNode} props.action - Optional action button
 * @param {Object} props.style - Additional inline styles
 */
const EmptyState = ({
  icon,
  title,
  description,
  action,
  style = {},
}) => {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '40px 20px',
    ...style,
  };

  const iconStyle = {
    color: '#E8E3D8',
    marginBottom: '16px',
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif",
    marginBottom: '8px',
  };

  const descriptionStyle = {
    fontSize: '14px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.5',
    maxWidth: '280px',
  };

  const actionStyle = {
    marginTop: '20px',
  };

  return (
    <div style={containerStyle}>
      {icon && React.cloneElement(icon, { size: 48, style: iconStyle })}
      {title && <div style={titleStyle}>{title}</div>}
      {description && <div style={descriptionStyle}>{description}</div>}
      {action && <div style={actionStyle}>{action}</div>}
    </div>
  );
};

export default EmptyState;
