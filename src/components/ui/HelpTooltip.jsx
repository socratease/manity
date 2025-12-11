import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Compact help button with hover tooltip
 *
 * @param {Object} props
 * @param {Array<{icon: string, text: string}>} props.tips - Array of tips to display
 * @param {Object} props.style - Additional inline styles for container
 */
const HelpTooltip = ({
  tips = [],
  style = {},
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const containerStyle = {
    position: 'relative',
    ...style,
  };

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
    border: '1px solid #E8E3D8',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
  };

  const iconStyle = {
    color: isHovered ? '#8B6F47' : '#6B6554',
    transition: 'color 0.2s ease',
  };

  const tooltipStyle = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '12px',
    padding: '12px 14px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
    border: '1px solid #E8E3D8',
    minWidth: '180px',
    opacity: isHovered ? 1 : 0,
    visibility: isHovered ? 'visible' : 'hidden',
    transform: isHovered ? 'translateY(0)' : 'translateY(-4px)',
    transition: 'all 0.2s ease',
    zIndex: 100,
  };

  const tipStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
    padding: '4px 0',
  };

  const tipIconStyle = {
    fontSize: '13px',
    flexShrink: 0,
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={buttonStyle}>
        <HelpCircle size={16} style={iconStyle} />
      </div>
      <div style={tooltipStyle}>
        {tips.map((tip, index) => (
          <div key={index} style={tipStyle}>
            <span style={tipIconStyle}>{tip.icon}</span>
            <span>{tip.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HelpTooltip;
