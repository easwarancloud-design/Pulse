import React from 'react';

const JiraIcon = ({ className = "w-7 h-7", color = "#2684FF" }) => {
  return (
    <div 
      className={`${className} rounded-full flex items-center justify-center`}
      style={{ backgroundColor: color }}
    >
      <span className="text-white text-sm font-semibold">J</span>
    </div>
  );
};

export default JiraIcon;