import React from 'react';

/**
 * Reusable Button component with multiple variants
 *
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'danger' | 'ghost'} props.variant - Button style variant
 * @param {'sm' | 'md' | 'lg'} props.size - Button size
 * @param {boolean} props.loading - Show loading state
 * @param {boolean} props.disabled - Disable the button
 * @param {boolean} props.iconOnly - Icon-only button (no text)
 * @param {React.ReactNode} props.icon - Icon to display
 * @param {React.ReactNode} props.children - Button text/content
 * @param {string} props.className - Additional class names
 * @param {Object} props.style - Additional inline styles
 * @param {Function} props.onClick - Click handler
 */
const Button = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled = false,
  iconOnly = false,
  icon,
  children,
  style = {},
  onClick,
  type = 'button',
  title,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const baseStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: iconOnly ? 0 : '6px',
    border: 'none',
    borderRadius: '10px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: isDisabled ? 0.5 : 1,
  };

  const sizeStyles = {
    sm: {
      padding: iconOnly ? '6px' : '6px 12px',
      fontSize: '12px',
    },
    md: {
      padding: iconOnly ? '10px 12px' : '10px 14px',
      fontSize: '13px',
    },
    lg: {
      padding: iconOnly ? '12px 14px' : '12px 20px',
      fontSize: '14px',
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: '#7A9B76',
      color: '#FFFFFF',
      border: 'none',
    },
    secondary: {
      backgroundColor: '#FFFFFF',
      color: '#3A3631',
      border: '1px solid #E8E3D8',
    },
    danger: {
      backgroundColor: '#D67C5C15',
      color: '#D67C5C',
      border: '1px solid #D67C5C',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#6B6554',
      border: 'none',
    },
  };

  const combinedStyles = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  return (
    <button
      type={type}
      style={combinedStyles}
      onClick={onClick}
      disabled={isDisabled}
      title={title}
      {...props}
    >
      {icon && React.cloneElement(icon, { size: size === 'sm' ? 12 : size === 'lg' ? 16 : 14 })}
      {loading ? 'Loading...' : children}
    </button>
  );
};

export default Button;
