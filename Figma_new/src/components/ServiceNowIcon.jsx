import React from 'react';

const ServiceNowIcon = ({ className = "w-7 h-7", color = "#62D84E" }) => {
  return (
    <div 
      className={`${className} rounded-full flex items-center justify-center`}
      style={{ backgroundColor: color }}
    >
      <span className="text-white text-xs font-semibold">SN</span>
    </div>
  );
};

export default ServiceNowIcon;