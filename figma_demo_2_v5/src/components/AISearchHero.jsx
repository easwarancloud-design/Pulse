import React, { useState, useEffect } from 'react';

const AISearchHero = ({ onSearch }) => {
  return (
    <div 
      className="relative"
      style={{
        background: 'linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: '24px',
        height: '300px',
        width: '100%'
      }}
    >
      {/* Iframe containing PulseEmbeddedDemo - full width no padding */}
      <div className="w-full h-full relative" style={{ zIndex: 10 }}>
        <iframe
          src="/pulseembedded_demo"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '0',
            background: 'transparent',
            overflow: 'hidden',
            maxWidth: '100%'
          }}
          scrolling="no"
          title="Pulse Embedded Demo Interface"
        />
      </div>
    </div>
  );
};

export default AISearchHero;
