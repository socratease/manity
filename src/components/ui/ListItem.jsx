import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Reusable ListItem component for lists with consistent styling
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon or dot indicator
 * @param {string} props.dotColor - Color for dot indicator (if no icon)
 * @param {string} props.title - Primary text
 * @param {string} props.subtitle - Secondary text
 * @param {boolean} props.showChevron - Show right chevron
 * @param {Function} props.onClick - Click handler
 * @param {Object} props.style - Additional inline styles
 */
const ListItem = ({
  icon,
  dotColor,
  title,
  subtitle,
  showChevron = false,
  onClick,
  style = {},
}) => {
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#FAF8F3',
    borderRadius: '8px',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
    ...style,
  };

  const dotStyle = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: dotColor || '#6B6554',
    flexShrink: 0,
  };

  const contentStyle = {
    flex: 1,
    minWidth: 0,
  };

  const titleStyle = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif",
  };

  const subtitleStyle = {
    fontSize: '11px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'capitalize',
  };

  const chevronStyle = {
    color: '#6B6554',
    flexShrink: 0,
  };

  return (
    <div style={containerStyle} onClick={onClick}>
      {icon || <span style={dotStyle} />}
      <div style={contentStyle}>
        {title && <div style={titleStyle}>{title}</div>}
        {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
      </div>
      {showChevron && <ChevronRight size={14} style={chevronStyle} />}
    </div>
  );
};

export default ListItem;
