import React from 'react';
import Header from './components/Header';
import AISearchHero from './components/AISearchHero';
import NewsFeed from './components/NewsFeed';
import RightSidebar from './components/RightSidebar';

const MainPage = ({ onSearch }) => {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Header />
      
      <AISearchHero onSearch={onSearch} />
      
      <div 
        className="flex flex-col items-center gap-8 w-full"
        style={{
          padding: '32px 0'
        }}
      >
        <div className="flex items-start gap-6 max-w-[1184px] w-full px-4">
          <NewsFeed />
          <RightSidebar />
        </div>
      </div>
    </div>
  );
};

export default MainPage;
