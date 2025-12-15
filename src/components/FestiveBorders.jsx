const FestiveBorders = () => {
  return (
    <>
      {/* Candy cane border - left side */}
      <div style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '8px',
        height: '100%',
        background: 'repeating-linear-gradient(45deg, #DC143C 0px, #DC143C 10px, white 10px, white 20px)',
        zIndex: 200,
        pointerEvents: 'none'
      }} />

      {/* Candy cane border - right side */}
      <div style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: '8px',
        height: '100%',
        background: 'repeating-linear-gradient(-45deg, #DC143C 0px, #DC143C 10px, white 10px, white 20px)',
        zIndex: 200,
        pointerEvents: 'none'
      }} />

      {/* Garland at top */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '40px',
        background: 'linear-gradient(to bottom, #228B22 0%, #1a6b1a 100%)',
        zIndex: 199,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        fontSize: '24px',
        paddingTop: '5px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        {/* Ornaments and decorations */}
        {['🔴', '🟡', '🔵', '⭐', '🔴', '🟡', '🔵', '⭐', '🔴', '🟡', '🔵', '⭐', '🔴', '🟡', '🔵', '⭐'].map((emoji, i) => (
          <span key={i} style={{
            animation: `sway ${2 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))'
          }}>
            {emoji}
          </span>
        ))}
      </div>

      {/* Garland at bottom */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '30px',
        background: 'linear-gradient(to top, #DC143C 0%, #a00f2e 100%)',
        zIndex: 199,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        fontSize: '20px',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.2)'
      }}>
        {/* Candy and treats */}
        {['🍬', '🎀', '🍭', '🎁', '🍬', '🎀', '🍭', '🎁', '🍬', '🎀', '🍭', '🎁'].map((emoji, i) => (
          <span key={i} style={{
            animation: `bounce ${1.5 + (i % 2)}s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s`,
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))'
          }}>
            {emoji}
          </span>
        ))}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes sway {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(3px) rotate(5deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </>
  );
};

export default FestiveBorders;
