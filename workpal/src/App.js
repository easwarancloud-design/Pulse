import React, { useState } from 'react';
import Mainpage from './Mainpage';
import ResultPage from './reslt_page';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('main');
  const [userQuestion, setUserQuestion] = useState('');

  const navigateToResults = (question) => {
    setUserQuestion(question);
    setCurrentPage('results');
  };

  const navigateToMain = () => {
    setCurrentPage('main');
    setUserQuestion('');
  };

  if (currentPage === 'results') {
    return (
      <div className="App">
        <ResultPage onBack={navigateToMain} userQuestion={userQuestion} />
      </div>
    );
  }

  return (
    <div className="App">
      <Mainpage onSearch={navigateToResults} />
    </div>
  );
}

export default App;
