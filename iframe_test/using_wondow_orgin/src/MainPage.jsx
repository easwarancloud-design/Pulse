import React from 'react';
import AISearchHero from './components/AISearchHero';

const MainPage = ({ onSearch }) => {
  return (
    <div className="h-screen overflow-hidden">
      <AISearchHero onSearch={onSearch} />
    </div>
  );
};

export default MainPage;
