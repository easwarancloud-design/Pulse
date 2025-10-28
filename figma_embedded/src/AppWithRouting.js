import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FigmaApp from './FigmaApp';
import FigmaHeroApp from './FigmaHeroApp';
import FigmaHeroAppWithRouting from './FigmaHeroAppWithRouting';

function AppWithRouting() {
  return (
    <Router>
      <Routes>
        {/* Redirect root to /figma */}
        <Route path="/" element={<Navigate to="/figma" replace />} />
        
        {/* Figma hero page - with full routing to results */}
        <Route path="/figma-hero" element={<FigmaHeroAppWithRouting />} />
        
        {/* Figma hero page simple - for iframe embedding only */}
        <Route path="/figma-hero-simple" element={<FigmaHeroApp />} />
        
        {/* Full Figma app route */}
        <Route path="/figma/*" element={<FigmaApp />} />
        
        {/* Catch all other routes and redirect to figma */}
        <Route path="*" element={<Navigate to="/figma" replace />} />
      </Routes>
    </Router>
  );
}

export default AppWithRouting;