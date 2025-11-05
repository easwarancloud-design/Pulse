import React, { useState } from 'react';
import {
  ChevronDown, Search, Bell, Globe
} from 'lucide-react';
import AISearchHero from './components/AISearchHero';

// --- Icon Components ---
// Custom/Branding Icon (The 'Pulse' logo icon)
const PulseLogo = () => (
  <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM12 4C7.582 4 4 7.582 4 12C4 16.418 7.582 20 12 20C16.418 20 20 16.418 20 12C20 7.582 16.418 4 12 4ZM10 16L14 12L10 8V16Z" fill="#3B82F6"/>
  </svg>
);

// Placeholder Avatar
const Avatar = () => (
  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/50 bg-blue-400 flex items-center justify-center text-sm font-semibold text-white">
    JA
  </div>
);

const PrimaryNavbar = () => (
  <header className="bg-white/95 backdrop-blur-sm shadow-md border-b border-gray-200 sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
      {/* Left side - Logo and Primary Links */}
      <div className="flex items-center space-x-6">
        <a href="#" className="flex items-center text-indigo-600 font-bold text-lg">
          <PulseLogo />
          Pulse
        </a>
        {[
          'Our Company', 'Our Focus', 'Our Initiatives', 'Our Resources'
        ].map(item => (
          <a key={item} href="#" className="hidden lg:flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600 group">
            {item}
            <ChevronDown className="w-3 h-3 ml-1 text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </a>
        ))}
      </div>

      {/* Right side - Utility Links and Profile */}
      <div className="flex items-center space-x-6">
        {/* Metric Display */}
        <div className="hidden sm:flex items-center text-sm font-semibold">
          <span className="text-gray-600 mr-1">ELV</span>
          <span className="text-indigo-600">467.86</span>
          <span className="text-green-500 ml-2">3.23</span>
        </div>

        {/* Icons */}
        <Search className="w-5 h-5 text-gray-500 hover:text-indigo-600 cursor-pointer" />
        <Bell className="w-5 h-5 text-gray-500 hover:text-indigo-600 cursor-pointer" />

        {/* User Actions */}
        <div className="hidden sm:flex items-center space-x-4">
          <a href="#" className="text-sm font-medium text-gray-700 hover:text-indigo-600">My HR</a>
          <div className="border-l border-gray-300 h-6"></div>
          <a href="#" className="text-sm font-medium text-gray-700 hover:text-indigo-600 flex items-center">
            <Globe className="w-4 h-4 mr-1" />
            Español
          </a>
        </div>

        {/* Avatar */}
        <a href="#" className="flex items-center space-x-2">
          <Avatar />
        </a>
      </div>
    </div>
  </header>
);

// --- Main PulseMain Component ---

const PulseMain = ({ onSearch }) => {
  return (
    // Only the hero section, full height and width
    <div className="h-screen w-full" style={{ height: '100vh' }}>
      <style>{`
        /* Override AISearchHero to take full height */
        .ai-search-hero-fullscreen > div:first-child {
          height: 100vh !important;
          min-height: 100vh !important;
        }
      `}</style>
      <div className="ai-search-hero-fullscreen" style={{ height: '100%' }}>
        <AISearchHero onSearch={onSearch} />
      </div>
    </div>
  );
};

export default PulseMain;