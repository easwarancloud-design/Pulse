import React from 'react';
import { ArrowLeft, Search, Plus, PanelLeft, Sun } from 'lucide-react';
import ChatIcon from './ChatIcon';
import JiraIcon from './JiraIcon';
import ServiceNowIcon from './ServiceNowIcon';

const MenuSidebarDark = ({ onBack, onToggleTheme, isCollapsed, onToggleCollapse, onNewChat, onThreadSelect }) => {
  const agents = [
    { id: 1, name: 'HR Agent', type: 'hr', bgColor: '#44B8F3' },
    { id: 2, name: 'Jira Agent', type: 'jira' },
    { id: 3, name: 'Service Now Agent', type: 'servicenow' }
  ];

  const lastWeekThreads = [
    {
      id: 'lw1',
      title: 'Can you create a service IT ticket for me ...',
      conversation: [
        { type: 'user', text: 'Can you create a service IT ticket for me to reset my password?' },
        { type: 'assistant', text: 'I\'d be happy to help you create a service IT ticket for password reset. Let me guide you through the process.' }
      ]
    },
    {
      id: 'lw2',
      title: 'Can you find confluence pages related ...',
      conversation: [
        { type: 'user', text: 'Can you find confluence pages related to our project documentation?' },
        { type: 'assistant', text: 'I\'ll search for confluence pages related to your project. Here are the relevant documents I found...' }
      ]
    },
    {
      id: 'lw3',
      title: 'What are the latest project updates for ...',
      conversation: [
        { type: 'user', text: 'What are the latest project updates for the Q4 initiatives?' },
        { type: 'assistant', text: 'Here are the latest updates for your Q4 initiatives based on the most recent data...' }
      ]
    },
    {
      id: 'lw4',
      title: 'What are the key metrics we should ...',
      conversation: [
        { type: 'user', text: 'What are the key metrics we should track for our team performance?' },
        { type: 'assistant', text: 'Based on your team\'s objectives, here are the key performance metrics you should track...' }
      ]
    }
  ];

  const last30DaysThreads = [
    {
      id: 'l30d1',
      title: 'Can you create a service IT ticket for me ...',
      conversation: [
        { type: 'user', text: 'Can you create a service IT ticket for me to install new software?' },
        { type: 'assistant', text: 'I\'ll help you create a service request for software installation. Let me collect the necessary details...' }
      ]
    },
    {
      id: 'l30d2',
      title: 'Can you create a service IT ticket for me ...',
      conversation: [
        { type: 'user', text: 'Can you create a service IT ticket for me to get access to the shared drive?' },
        { type: 'assistant', text: 'I\'ll create an access request ticket for the shared drive. Here\'s what I need from you...' }
      ]
    },
    {
      id: 'l30d3',
      title: 'Can you find confluence pages related ...',
      conversation: [
        { type: 'user', text: 'Can you find confluence pages related to our onboarding process?' },
        { type: 'assistant', text: 'I found several confluence pages related to onboarding. Here are the most relevant ones...' }
      ]
    }
  ];

  return (
    <div 
      className={`bg-gradient-to-br from-[#122F65] to-[#00123C] flex flex-col h-screen shadow-[0_20px_40px_0_rgba(0,47,189,0.10)] transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-[295px]'
      }`}
    >
      {isCollapsed ? (
        <div className="flex flex-col items-center py-4 space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <button 
              onClick={onToggleCollapse}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Expand Sidebar"
            >
              <svg width="24" height="24" viewBox="0 0 42 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 8V32H34V8H8ZM10.1667 10.1818H17.75V29.8182H10.1667V10.1818ZM19.9167 10.1818H31.8333V29.8182H19.9167V10.1818Z" fill="#44B8F3"/>
              </svg>
            </button>
            
            <button 
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-6 h-6 text-[#44B8F3]" />
            </button>
            
            <button
              onClick={onToggleTheme}
              className="relative w-12 h-6 rounded-full border flex items-center transition-all"
              style={{ borderColor: '#44B8F3', backgroundColor: '#1A202C' }}
            >
              {/* Toggle Circle */}
              <div
                className="absolute w-[19px] h-[19px] rounded-full transition-all"
                style={{
                  backgroundColor: '#44B8F3',
                  left: '3px',
                  top: '2px'
                }}
              />
              {/* Sun Icon */}
              <Sun
                className="absolute w-5 h-5"
                style={{
                  color: '#44B8F3',
                  right: '2px',
                  top: '2px'
                }}
              />
            </button>
            
            <button 
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Search"
            >
              <Search className="w-6 h-6 text-[#A0BEEA]" />
            </button>
          </div>
          
          <div className="flex flex-col space-y-3">
            <div 
              className="w-8 h-8 rounded-full bg-[#44B8F3] flex items-center justify-center cursor-pointer"
              title="HR Assistant"
            >
              <span className="text-white text-xs font-bold">HR</span>
            </div>
            <div 
              className="w-8 h-8 rounded-full bg-[#2861BB] flex items-center justify-center cursor-pointer"
              title="Jira Agent"
            >
              <span className="text-white text-xs font-bold">J</span>
            </div>
            <div 
              className="w-8 h-8 rounded-full bg-[#00BB89] flex items-center justify-center cursor-pointer"
              title="Service Now Agent"
            >
              <span className="text-white text-xs font-bold">SN</span>
            </div>
          </div>
          
          <div className="mt-auto">
            <button
              className="w-10 h-10 bg-[#44B8F3] rounded-full flex items-center justify-center hover:bg-[#3aa3e3] transition-colors"
              title="New Chat"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex-shrink-0 px-4 pt-6 pb-4">
            <div className="flex flex-col gap-6">
              <div className="flex h-10 items-center justify-between">
                <svg width="88" height="23" viewBox="0 0 88 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.06779 9.46522L10.8003 21.3309C10.8528 21.5547 10.911 21.6206 10.9647 21.6666C11.0594 21.7479 11.1884 21.7785 11.3227 21.7785C11.4472 21.7846 11.534 21.7383 11.636 21.6666C11.7379 21.5949 11.849 21.4501 11.8853 21.3309L15.7121 10.7418H23.4121C23.781 10.7418 24.018 10.6272 24.2789 10.3663C24.5397 10.1054 24.7264 9.72825 24.7264 9.35934C24.7264 8.99042 24.5397 8.61324 24.2789 8.35238C24.018 8.09152 23.781 7.95985 23.4121 7.95985H14.757C14.4873 7.95995 14.2251 8.04819 14.0102 8.21114C13.7954 8.37409 13.6397 8.60281 13.5669 8.86245L11.7648 15.292L9.06262 2.08694C9.03931 1.96406 8.93299 1.83366 8.83885 1.75129C8.74472 1.66893 8.6281 1.6462 8.5032 1.63941C8.37863 1.63205 8.27051 1.68067 8.16755 1.75118C8.06458 1.82169 7.98196 1.96806 7.94378 2.08686L5.598 8.53479H1.391C1.02208 8.53479 0.668277 8.68135 0.407414 8.94221C0.146551 9.20307 0 9.55688 0 9.92579C0 10.2947 0.146551 10.6485 0.407414 10.9094C0.668277 11.1702 1.02208 11.3168 1.391 11.3168H6.47896C6.76814 11.3172 7.04991 11.2254 7.28337 11.0547C7.51683 10.8841 7.68982 10.6435 7.77723 10.3678L8.06779 9.46522Z" fill="#87D2F7"/>
                  <path d="M58.428 19.0425L58.8024 21.9626L58.6278 22.0208C58.1438 22.1821 57.5237 22.3142 57.022 22.3142C56.0327 22.3142 55.0543 21.9837 54.3236 21.2278C53.5923 20.4713 53.1329 19.3136 53.1329 17.7046V0H56.3372V17.7359C56.3372 18.3534 56.5057 18.738 56.7254 18.9673C56.9452 19.1967 57.2424 19.2978 57.5545 19.2978C57.7359 19.2978 57.9562 19.2447 58.1556 19.1592L58.428 19.0425Z" fill="white"/>
                  <path d="M41.0709 6.54746V15.073C41.0709 16.3462 41.442 17.3865 42.0727 18.1052C42.701 18.8212 43.6015 19.2351 44.7004 19.2351C45.8162 19.2351 46.7328 18.8203 47.3726 18.1038C48.0144 17.3849 48.3926 16.345 48.3926 15.073V6.54746H51.6283V15.2923C51.6283 17.3783 50.9455 19.1297 49.727 20.3604C48.5083 21.5913 46.772 22.2829 44.7004 22.2829C42.644 22.2829 40.9231 21.5909 39.7162 20.3596C38.5098 19.1287 37.8352 17.3775 37.8352 15.2923V6.54746H41.0709Z" fill="white"/>
                  <path d="M21.6836 11.7076V22.0005H24.9506V14.6698H28.8621C31.2348 14.6698 33.2238 14.0249 34.624 12.8682C36.0282 11.7082 36.8238 10.0464 36.8238 8.05524C36.8238 6.06479 36.0365 4.41063 34.6437 3.25811C33.255 2.10898 31.2815 1.47198 28.9247 1.47198H21.6836V6.78473H24.9506V4.45705H29.1754C30.4661 4.45705 31.5311 4.82136 32.2693 5.44577C33.0041 6.06722 33.4314 6.95921 33.4314 8.05524C33.4314 9.15155 33.0039 10.0518 32.2684 10.6812C31.5298 11.3133 30.4649 11.6848 29.1754 11.6848L25.0625 11.7076H21.6836Z" fill="white"/>
                  <path d="M70.0517 10.1616L70.2596 10.2778L71.5557 7.57458L71.3542 7.47767C69.7039 6.68425 68.0728 6.17111 65.9942 6.17111C62.2837 6.17111 60.1315 8.20265 60.1315 10.5928C60.1315 12.1069 60.6925 13.1271 61.5423 13.8447C62.3794 14.5514 63.484 14.9534 64.552 15.2714C64.8425 15.358 65.129 15.438 65.4077 15.5159L65.4083 15.5161L65.4086 15.5162C66.1732 15.7299 66.8792 15.9272 67.4495 16.1962C67.8335 16.3774 68.1339 16.5821 68.3378 16.8285C68.5374 17.0697 68.6526 17.3604 68.6526 17.7355C68.6526 18.2586 68.437 18.6902 67.9861 19C67.5246 19.317 66.8003 19.5167 65.7749 19.5167C64.1011 19.5167 62.6651 19.0315 60.9908 18.1634L60.7836 18.056L59.5343 20.7382L59.7087 20.8416C61.2792 21.771 63.3237 22.3765 65.587 22.3765C67.5331 22.3765 69.0971 21.89 70.1802 21.0531C71.2677 20.2128 71.857 19.028 71.857 17.6729C71.857 16.1816 71.2992 15.1769 70.4553 14.4694C69.6244 13.7729 68.5279 13.3749 67.4683 13.057C67.1935 12.9746 66.9224 12.8978 66.6582 12.8229L66.6579 12.8228C65.884 12.6035 65.1689 12.4008 64.5937 12.1232C64.213 11.9394 63.9147 11.7316 63.712 11.4817C63.5134 11.2367 63.3985 10.9415 63.3985 10.5615C63.3985 10.1036 63.6205 9.74157 64.0665 9.48229C64.5239 9.21638 65.2154 9.06229 66.1195 9.06229C67.5124 9.06229 69.0099 9.57945 70.0517 10.1616Z" fill="white"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M86.8791 19.9419L86.7502 20.0807C85.479 21.4497 83.2851 22.3765 80.822 22.3765C76.1193 22.3765 72.735 18.7309 72.735 14.2581C72.735 9.79532 75.9845 6.17111 80.3834 6.17111C84.7116 6.17111 88.0005 9.63024 88.0005 13.9762C88.0005 14.1695 87.9924 14.4098 87.9764 14.6307C87.9608 14.845 87.9363 15.0622 87.8979 15.1968L87.8515 15.3591H76.0706C76.4919 17.7276 78.3396 19.4541 80.916 19.4541C82.5504 19.4541 83.9966 18.8182 84.9556 17.8592L85.1357 17.6791L86.8791 19.9419ZM83.1469 10.0031C82.4236 9.34997 81.4914 8.99958 80.4147 8.99958C78.2826 8.99958 76.7049 10.4685 76.154 12.6247H84.587C84.3237 11.4915 83.8198 10.6109 83.1469 10.0031Z" fill="white"/>
                </svg>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={onToggleTheme}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title="Switch to Light Mode"
                  >
                    <Sun className="w-6 h-6 text-[#44B8F3]" />
                  </button>
                  
                  <button 
                    onClick={onToggleCollapse}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title="Collapse Sidebar"
                  >
                    <PanelLeft className="w-6 h-6 text-[#44B8F3]" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <button 
                  onClick={onBack}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 text-[#44B8F3]" />
                  <span className="text-[#A0BEEA] text-base font-medium">Back</span>
                </button>

                <div className="flex items-center gap-3 p-3 rounded-lg border border-[#A0BEEA]/20 bg-white/5">
                  <Search className="w-6 h-6 text-[#A0BEEA]" />
                  <input 
                    type="text" 
                    placeholder="Search..."
                    className="flex-1 bg-transparent text-[#A0BEEA] placeholder-[#A0BEEA]/60 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4">
            <div className="flex flex-col gap-6 pb-4">
              <div className="flex flex-col gap-4">
                <h3 className="text-[#A0BEEA] text-sm font-medium">Agents</h3>
                <div className="flex flex-col gap-3">
                  {agents.map((agent) => (
                    <div 
                      key={agent.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {agent.type === 'hr' && (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: agent.bgColor }}
                        >
                          <span className="text-white text-sm font-bold">HR</span>
                        </div>
                      )}
                      {agent.type === 'jira' && (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center">
                          <JiraIcon className="w-10 h-10" />
                        </div>
                      )}
                      {agent.type === 'servicenow' && (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center">
                          <ServiceNowIcon className="w-10 h-10" />
                        </div>
                      )}
                      <span className="text-white text-base font-medium">{agent.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-[#A0BEEA] text-sm font-medium text-left">Previous Threads</h3>
                
                <div className="flex flex-col gap-2">
                  <h4 className="text-[#A0BEEA]/80 text-xs font-medium text-left">Last week (4)</h4>
                  {lastWeekThreads.map((thread, index) => (
                    <div 
                      key={index}
                      onClick={() => onThreadSelect && onThreadSelect(thread)}
                      className="flex items-center gap-2 text-[#A0BEEA] text-sm p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <ChatIcon className="w-4 h-4 flex-shrink-0" color="#A0BEEA" />
                      <span 
                        className="truncate"
                        style={{
                          overflow: 'hidden',
                          color: '#FFF',
                          textOverflow: 'ellipsis',
                          fontFamily: 'Elevance Sans',
                          fontSize: '14px',
                          fontStyle: 'normal',
                          fontWeight: 500,
                          lineHeight: '16px'
                        }}
                      >
                        {thread.title}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="text-[#A0BEEA]/80 text-xs font-medium text-left">Last 30 days (18)</h4>
                  {last30DaysThreads.map((thread, index) => (
                    <div 
                      key={index}
                      onClick={() => onThreadSelect && onThreadSelect(thread)}
                      className="flex items-center gap-2 text-[#A0BEEA] text-sm p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <ChatIcon className="w-4 h-4 flex-shrink-0" color="#A0BEEA" />
                      <span 
                        className="truncate"
                        style={{
                          overflow: 'hidden',
                          color: '#FFF',
                          textOverflow: 'ellipsis',
                          fontFamily: 'Elevance Sans',
                          fontSize: '14px',
                          fontStyle: 'normal',
                          fontWeight: 500,
                          lineHeight: '16px'
                        }}
                      >
                        {thread.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 p-4">
            <button 
              onClick={() => onNewChat && onNewChat()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.74315 2.64823C8.69349 2.28215 8.3797 2 8 2C7.58579 2 7.25 2.33579 7.25 2.75V7.25H2.75L2.64823 7.25685C2.28215 7.30651 2 7.6203 2 8C2 8.41421 2.33579 8.75 2.75 8.75H7.25V13.25L7.25685 13.3518C7.30651 13.7178 7.6203 14 8 14C8.41421 14 8.75 13.6642 8.75 13.25V8.75H13.25L13.3518 8.74315C13.7178 8.69349 14 8.3797 14 8C14 7.58579 13.6642 7.25 13.25 7.25H8.75V2.75L8.74315 2.64823Z" fill="#2861BB"/>
              </svg>
              <span className="text-sm font-semibold" style={{ color: '#2861BB' }}>New chat</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuSidebarDark;