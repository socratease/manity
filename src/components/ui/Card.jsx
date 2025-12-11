import React from 'react';

/**
 * Reusable Card component with header, content, and footer sections
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {React.ReactNode} props.header - Header content
 * @param {React.ReactNode} props.footer - Footer content
 * @param {string} props.accentColor - Accent color for gradient header
 * @param {boolean} props.hoverable - Add hover effect
 * @param {Function} props.onClick - Click handler
 * @param {Object} props.style - Additional inline styles
 */
const Card = ({
  children,
  header,
  footer,
  accentColor,
  hoverable = false,
  onClick,
  style = {},
}) => {
  const cardStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E8E3D8',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    cursor: onClick || hoverable ? 'pointer' : 'default',
    ...style,
  };

  const headerStyle = accentColor ? {
    background: `linear-gradient(135deg, ${accentColor}15 0%, ${accentColor}05 100%)`,
    padding: '16px 20px',
    borderBottom: `1px solid ${accentColor}20`,
  } : {
    padding: '16px 20px',
    borderBottom: '1px solid #E8E3D8',
  };

  const contentStyle = {
    padding: '16px 20px',
  };

  const footerStyle = {
    padding: '12px 20px',
    borderTop: '1px solid #E8E3D8',
    backgroundColor: '#FAF8F3',
  };

  return (
    <div style={cardStyle} onClick={onClick}>
      {header && <div style={headerStyle}>{header}</div>}
      <div style={contentStyle}>{children}</div>
      {footer && <div style={footerStyle}>{footer}</div>}
    </div>
  );
};

export default Card;
