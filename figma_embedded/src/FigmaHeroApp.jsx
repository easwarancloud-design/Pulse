import React from 'react';
import FigmaHeroPage from './FigmaHeroPage';

function FigmaHeroApp({ username = "Jane" }) {
  return (
    <div>
      <FigmaHeroPage username={username} />
    </div>
  );
}

export default FigmaHeroApp;