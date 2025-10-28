import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children, defaultTheme = 'dark' }) => {
  const [isDarkMode, setIsDarkMode] = useState(defaultTheme === 'dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      // If no saved theme, use the defaultTheme prop
      setIsDarkMode(defaultTheme === 'dark');
    }
  }, [defaultTheme]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    colors: isDarkMode ? {
      primary: '#03112F',
      secondary: '#1F3E81',
      accent: '#44B8F3',
      accentMedium: '#8FD4F8',
      inactive: '#A0BEEA',
      text: '#FFFFFF',
      textSecondary: '#A0BEEA',
      border: '#2861BB',
      cta: '#44B8F3',
      error: '#D04348',
      errorHighlight: '#E3725F',
      success: '#00BB89',
      navy: '#1A3673',
      background: 'linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)'
    } : {
      primary: '#FFFFFF',
      secondary: '#F7F7F7',
      accent: '#2861BB',
      accentMedium: '#0C7DB6',
      inactive: '#949494',
      text: '#333333',
      textSecondary: '#787777',
      border: '#CCCCCC',
      cta: '#2861BB',
      error: '#D04348',
      errorHighlight: '#CB0042',
      success: '#00BB89',
      navy: '#1A3673',
      background: '#F9FAFB'
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};