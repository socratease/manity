import React from 'react';

/**
 * Reusable Avatar component with team colors and initials
 *
 * @param {Object} props
 * @param {string} props.name - Person's name (used to generate initials)
 * @param {string} props.color - Team color (hex)
 * @param {'xs' | 'sm' | 'md' | 'lg' | 'xl'} props.size - Avatar size
 * @param {boolean} props.bordered - Show border around avatar
 * @param {Object} props.style - Additional inline styles
 */
const Avatar = ({
  name = '',
  color = '#6B6554',
  size = 'md',
  bordered = true,
  src = null,
  style = {},
}) => {
  const getInitials = (name) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return parts.map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const sizeConfig = {
    xs: { size: 22, fontSize: 9, borderWidth: 2 },
    sm: { size: 36, fontSize: 12, borderWidth: 2 },
    md: { size: 48, fontSize: 16, borderWidth: 3 },
    lg: { size: 56, fontSize: 18, borderWidth: 3 },
    xl: { size: 80, fontSize: 24, borderWidth: 3 },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  const avatarStyle = {
    width: `${config.size}px`,
    height: `${config.size}px`,
    borderRadius: '50%',
    backgroundColor: `${color}20`,
    border: bordered ? `${config.borderWidth}px solid ${color}` : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${config.fontSize}px`,
    fontWeight: '700',
    fontFamily: "'Inter', sans-serif",
    color: color,
    flexShrink: 0,
    ...style,
  };

  return (
    <div style={avatarStyle}>
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
};

export default Avatar;
