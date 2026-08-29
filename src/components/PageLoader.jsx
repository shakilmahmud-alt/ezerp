import React from 'react';

const PageLoader = ({ text = 'Loading...', fullScreen = false, size = 130 }) => {
  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      userSelect: 'none'
    }}>
      <img 
        src="https://ik.imagekit.io/eg7u6xcn0u/Shopping-Cart.gif" 
        alt="Loading..." 
        style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }} 
      />
      {text && (
        <div style={{
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--accent-primary, #2e6f40)',
          letterSpacing: '0.3px'
        }}>
          {text}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999
      }}>
        {content}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      minHeight: '160px',
      padding: '24px'
    }}>
      {content}
    </div>
  );
};

export default PageLoader;
