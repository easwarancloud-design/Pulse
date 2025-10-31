import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, ArrowLeft, Sun, Edit2, Trash2, Check, X } from 'lucide-react';
import ChatIcon from './components/ChatIcon';
import JiraIcon from './components/JiraIcon';
import ServiceNowIcon from './components/ServiceNowIcon';

const MenuSidebar = ({ onBack, onToggleTheme, isDarkMode, onNewChat, onThreadSelect, currentActiveThread, isNewChatActive, showBackButton = true }) => {
  const [isDarkModeLocal, setIsDarkModeLocal] = useState(isDarkMode || false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ref for search input to focus when expanded
  const searchInputRef = useRef(null);

  // Load threads from localStorage or use default
  const loadThreadsFromStorage = () => {
    try {
      const stored = localStorage.getItem('chatThreads');
      if (stored) {
        const parsedData = JSON.parse(stored);
        // Ensure all required categories exist
        return {
          today: parsedData.today || [],
          yesterday: parsedData.yesterday || [],
          lastWeek: parsedData.lastWeek || [],
          last30Days: parsedData.last30Days || []
        };
      }
    } catch (error) {
      console.error('Error loading threads from localStorage:', error);
    }
    return {
      today: [
        {
          id: 't1',
          title: 'How to submit sick leave in Workday?',
          conversation: [
            { type: 'user', text: 'How do I submit sick leave requests in Workday?' },
            { type: 'assistant', text: 'To submit sick leave in Workday: 1) Go to Workday homepage > "Time" tile, 2) Click "Request Time Off", 3) Select "Sick Leave" from the dropdown, 4) Choose your dates and duration (full day or partial), 5) Add notes if needed, 6) Submit for approval. For same-day sick leave, you can also call your manager and submit the request when you return. No doctor\'s note required for absences under 3 consecutive days.' }
          ]
        },
        {
          id: 't2',
          title: 'Understanding our compensation review cycle',
          conversation: [
            { type: 'user', text: 'When does our compensation review happen and how does it work?' },
            { type: 'assistant', text: 'Our compensation review occurs annually in March. The process includes: salary benchmarking against market data, performance rating consideration, budget allocation per department, and manager recommendations. Merit increases range from 2-8% based on performance and market position. Promotions are evaluated separately in Q4. You\'ll receive notification of any changes by April 1st, effective with the April payroll.' }
          ]
        },
        {
          id: 't3',
          title: 'How to access employee handbook in Workday?',
          conversation: [
            { type: 'user', text: 'Where can I find the employee handbook and company policies in Workday?' },
            { type: 'assistant', text: 'Access the employee handbook in Workday by: 1) Logging into Workday, 2) Click on the "Benefits" worklet, 3) Select "View All Benefits", 4) Look for "Resources and Documents" section, 5) Click "Employee Handbook". You can also find specific policies under "Company" > "Company Documents" > "HR Policies". The handbook is updated quarterly, and you\'ll be notified of major policy changes via email.' }
          ]
        },
        {
          id: 't4',
          title: 'Requesting flexible work arrangements',
          conversation: [
            { type: 'user', text: 'How do I request flexible work arrangements or schedule changes?' },
            { type: 'assistant', text: 'To request flexible work arrangements: 1) Discuss with your manager first to ensure business needs are met, 2) Complete the "Flexible Work Request" form in Workday under "Actions" > "Job Change" > "Request Flexible Work", 3) Specify your requested schedule, work location, and business justification, 4) Submit for manager and HR approval. Requests are typically processed within 5-7 business days. Arrangements are reviewed every 6 months.' }
          ]
        },
        {
          id: 't5',
          title: 'How to view pay statements in Workday?',
          conversation: [
            { type: 'user', text: 'Where do I find my pay statements and tax documents in Workday?' },
            { type: 'assistant', text: 'View your pay information in Workday by: 1) Go to "Pay" worklet on homepage, 2) Click "View Pay" to see current and past pay statements, 3) For tax documents, go to "Pay" > "Tax Documents" to access W-2s and other forms, 4) You can download PDFs or view online. Pay statements are available immediately after each payroll run (bi-weekly on Fridays). Set up email notifications under "Pay" > "Pay Preferences" to get alerts when new statements are available.' }
          ]
        }
      ],
      yesterday: [
        {
          id: 'y1',
          title: 'FMLA leave application process',
          conversation: [
            { type: 'user', text: 'How do I apply for FMLA leave and what documentation is required?' },
            { type: 'assistant', text: 'To apply for FMLA leave: 1) Contact HR at least 30 days in advance (or ASAP for emergencies), 2) Complete the FMLA request form in Workday under "Benefits" > "Leave of Absence", 3) Obtain medical certification from your healthcare provider using Form DOL-WH-380-E, 4) Submit all documentation to leave@company.com. You\'re eligible if you\'ve worked 1,250+ hours in the past 12 months. FMLA provides up to 12 weeks unpaid leave with job protection and continued health benefits.' }
          ]
        },
        {
          id: 'y2',
          title: 'Emergency contact updates in Workday',
          conversation: [
            { type: 'user', text: 'How do I update my emergency contacts and personal information in Workday?' },
            { type: 'assistant', text: 'Update your emergency contacts in Workday: 1) Go to "Personal Information" worklet, 2) Click "Emergency Contacts", 3) Add, edit, or remove contacts as needed, 4) Include full name, relationship, phone numbers, and address, 5) Save changes. Also update your personal address, phone number, and email under "Personal Information" > "Contact Information". Keep this information current as it\'s used for emergency notifications and important company communications.' }
          ]
        },
        {
          id: 'y3',
          title: 'Dependent coverage and life events',
          conversation: [
            { type: 'user', text: 'How do I add dependents to my benefits after a qualifying life event?' },
            { type: 'assistant', text: 'After a qualifying life event (marriage, birth, adoption, etc.): 1) You have 30 days to make changes, 2) Go to Workday "Benefits" > "Change Benefits", 3) Select your qualifying event type, 4) Add dependents with their information and required documents, 5) Adjust your benefit selections, 6) Submit by the 30-day deadline. Required documents include marriage certificates, birth certificates, or adoption papers. Changes are effective the first of the month following your event date.' }
          ]
        },
        {
          id: 'y4',
          title: 'Workday mobile app setup and features',
          conversation: [
            { type: 'user', text: 'How do I set up the Workday mobile app and what can I do with it?' },
            { type: 'assistant', text: 'Download the Workday app from your app store and sign in with your company credentials. Key features include: time tracking and time-off requests, pay statement viewing, benefits information access, emergency contact updates, and company directory search. Enable push notifications to get alerts for important deadlines. You can also approve team member requests if you\'re a manager. The app syncs with the desktop version in real-time.' }
          ]
        }
      ],
      lastWeek: [
        {
          id: 'lw1',
          title: 'Annual enrollment period and deadlines',
          conversation: [
            { type: 'user', text: 'When is annual enrollment and what changes can I make to my benefits?' },
            { type: 'assistant', text: 'Annual enrollment runs November 1-15 each year. During this period, you can: change health insurance plans, adjust FSA/HSA contributions, modify life insurance coverage, update dependent coverage, and select voluntary benefits like legal services or pet insurance. If you don\'t make changes, your current elections continue (except FSA, which resets to $0). Review the benefits fair materials and attend information sessions. Changes are effective January 1st.' }
          ]
        },
        {
          id: 'lw2',
          title: 'Tuition reimbursement program requirements',
          conversation: [
            { type: 'user', text: 'What are the requirements for tuition reimbursement and how do I apply?' },
            { type: 'assistant', text: 'Tuition reimbursement eligibility: 1) Employed for 12+ months, 2) Course must be job-related or lead to degree in your field, 3) Maintain "C" grade or better, 4) Pre-approval required. Apply through Workday "Learning" > "Tuition Assistance" before enrollment. Reimbursement is up to $5,000/year for undergraduate and $7,500/year for graduate courses. Submit receipts and transcripts within 60 days of course completion. Two-year commitment required post-graduation.' }
          ]
        },
        {
          id: 'lw3',
          title: 'Workers compensation claim process',
          conversation: [
            { type: 'user', text: 'What should I do if I get injured at work? How do I file a workers comp claim?' },
            { type: 'assistant', text: 'For workplace injuries: 1) Seek immediate medical attention if needed, 2) Report to your supervisor immediately, 3) Call our 24/7 injury hotline: 1-800-INJURY-1, 4) Complete incident report in Workday within 24 hours, 5) Follow up with designated medical provider. Keep all medical documentation and receipts. You may be eligible for medical coverage and wage replacement. Return-to-work accommodations are available. Contact HR for guidance throughout the process.' }
          ]
        },
        {
          id: 'lw4',
          title: 'Sabbatical leave policy and eligibility',
          conversation: [
            { type: 'user', text: 'Does our company offer sabbatical leave? What are the requirements?' },
            { type: 'assistant', text: 'Sabbatical leave is available after 7 years of continuous employment. You can take 3-6 months unpaid leave for professional development, research, travel, or personal enrichment. Requirements: submit proposal 6 months in advance, demonstrate how it benefits your role/company, arrange coverage for your responsibilities, commit to returning for minimum 2 years. During sabbatical, benefits continue with employee contribution. Apply through Workday "Actions" > "Request Leave of Absence" > "Sabbatical".' }
          ]
        },
        {
          id: 'lw5',
          title: 'Internal job posting and transfer process',
          conversation: [
            { type: 'user', text: 'How do I apply for internal job postings and what\'s the transfer process?' },
            { type: 'assistant', text: 'Internal job applications: 1) Browse open positions in Workday "Career" worklet, 2) Click "Find Jobs" to search by location, department, or keywords, 3) Apply directly through Workday with updated profile, 4) Notify your current manager after applying, 5) Complete any required assessments. Interview process is similar to external hires. If selected, typical notice period is 2-4 weeks. You must be in current role for 12+ months and have satisfactory performance to be eligible for transfer.' }
          ]
        }
      ],
      last30Days: [
        {
          id: 'l30d1',
          title: 'Stock purchase plan enrollment',
          conversation: [
            { type: 'user', text: 'How does the employee stock purchase plan work and how do I enroll?' },
            { type: 'assistant', text: 'Our Employee Stock Purchase Plan (ESPP) allows you to buy company stock at a 15% discount. Enrollment periods are twice yearly (May and November). You can contribute 1-15% of your base salary through payroll deduction. Stock purchases occur at the end of each 6-month period at the lower of the beginning or ending price, minus 15% discount. Enroll in Workday "Benefits" > "Stock Purchase Plan". Minimum tenure of 6 months required. You can sell immediately or hold for long-term investment.' }
          ]
        },
        {
          id: 'l30d2',
          title: 'Exit interview process and final pay',
          conversation: [
            { type: 'user', text: 'What happens during the exit process when leaving the company?' },
            { type: 'assistant', text: 'Exit process includes: 1) Two weeks notice (or per your contract), 2) Exit interview with HR (scheduled automatically), 3) Return company property (laptop, badge, phone), 4) Knowledge transfer documentation, 5) Final paycheck includes unused vacation (per state law), 6) COBRA benefits information, 7) 401k rollover options, 8) Reference policy acknowledgment. Your final pay will be processed on your last day or next regular payroll, depending on state requirements. Access to systems is removed on your last day.' }
          ]
        },
        {
          id: 'l30d3',
          title: 'Jury duty leave and compensation',
          conversation: [
            { type: 'user', text: 'What\'s our policy for jury duty leave and will I still get paid?' },
            { type: 'assistant', text: 'Jury duty leave policy: 1) Notify your manager immediately upon receiving jury summons, 2) Submit copy of summons to HR, 3) Company provides full pay for first 5 days of jury service, 4) Submit jury duty certificate for payroll processing, 5) You keep any jury compensation received. If service extends beyond 5 days, additional time is unpaid but job-protected. Night shift employees should request day shift consideration. Use Workday to request "Jury Duty" time off type. Court parking and mileage may be reimbursed.' }
          ]
        },
        {
          id: 'l30d4',
          title: 'Volunteer time off program benefits',
          conversation: [
            { type: 'user', text: 'Does the company offer volunteer time off? How does the program work?' },
            { type: 'assistant', text: 'Yes! Our Volunteer Time Off (VTO) program provides 16 hours (2 days) of paid time annually for volunteer activities with qualified 501(c)(3) organizations. To use VTO: 1) Confirm organization\'s nonprofit status, 2) Submit volunteer opportunity for pre-approval via Workday "Time" > "Request Volunteer Time Off", 3) Include organization details and volunteer description, 4) Complete volunteer service, 5) Submit verification form with organization signature. VTO hours don\'t roll over and are separate from regular PTO.' }
          ]
        },
        {
          id: 'l30d5',
          title: 'Lactation support and mother\'s room access',
          conversation: [
            { type: 'user', text: 'What lactation support does the company provide for nursing mothers?' },
            { type: 'assistant', text: 'Lactation support includes: dedicated mother\'s rooms on each floor with comfortable seating, refrigeration for milk storage, and privacy locks. Rooms can be reserved through Workday "Space Reservations". You\'re entitled to reasonable break time for pumping for up to one year. Flexible schedule accommodations available through your manager. The company also provides lactation consultants, breast pump rental/purchase assistance, and shipping supplies for business travel. Contact HR for access card programming and additional resources.' }
          ]
        }
      ]
    };
  };

  const [allThreads, setAllThreads] = useState(loadThreadsFromStorage());
  
  // Filter threads based on search query
  const getFilteredThreads = () => {
    // Ensure all categories exist with default empty arrays
    const safeAllThreads = {
      today: allThreads.today || [],
      yesterday: allThreads.yesterday || [],
      lastWeek: allThreads.lastWeek || [],
      last30Days: allThreads.last30Days || []
    };

    if (!searchQuery.trim()) {
      return safeAllThreads;
    }
    
    const filterThreadsArray = (threads) => 
      threads.filter(thread => 
        thread.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    return {
      today: filterThreadsArray(safeAllThreads.today),
      yesterday: filterThreadsArray(safeAllThreads.yesterday),
      lastWeek: filterThreadsArray(safeAllThreads.lastWeek),
      last30Days: filterThreadsArray(safeAllThreads.last30Days)
    };
  };
  
  const filteredThreads = getFilteredThreads();
  const isSearching = searchQuery.trim().length > 0;
  
  // Handle search icon click in collapsed mode
  const handleSearchIconClick = () => {
    setIsCollapsed(false); // Expand the sidebar
    // Focus the search input after a short delay to ensure it's rendered
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };
  
  // Refresh threads when component mounts or when localStorage changes
  useEffect(() => {
    const refreshThreads = () => {
      setAllThreads(loadThreadsFromStorage());
    };
    
    // Listen for storage events to refresh when other tabs update localStorage
    window.addEventListener('storage', refreshThreads);
    
    // Also set up an interval to refresh periodically (in case same-tab updates don't trigger storage event)
    const interval = setInterval(refreshThreads, 1000);
    
    return () => {
      window.removeEventListener('storage', refreshThreads);
      clearInterval(interval);
    };
  }, []);
  
  // Handle thread rename
  const handleRenameThread = (threadId, newTitle) => {
    try {
      const stored = localStorage.getItem('chatThreads');
      if (stored) {
        const threadsData = JSON.parse(stored);
        
        // Find and update the thread in the correct category
        ['today', 'yesterday', 'lastWeek', 'last30Days'].forEach(category => {
          if (threadsData[category]) {
            const threadIndex = threadsData[category].findIndex(t => t.id === threadId);
            if (threadIndex !== -1) {
              threadsData[category][threadIndex].title = newTitle;
            }
          }
        });
        
        localStorage.setItem('chatThreads', JSON.stringify(threadsData));
        setAllThreads(loadThreadsFromStorage());
      }
    } catch (error) {
      console.error('Error renaming thread:', error);
    }
    setEditingThreadId(null);
    setEditingTitle('');
  };
  
  // Handle thread delete
  const handleDeleteThread = (threadId) => {
    try {
      const stored = localStorage.getItem('chatThreads');
      if (stored) {
        const threadsData = JSON.parse(stored);
        
        // Remove the thread from the correct category
        ['today', 'yesterday', 'lastWeek', 'last30Days'].forEach(category => {
          if (threadsData[category]) {
            threadsData[category] = threadsData[category].filter(t => t.id !== threadId);
          }
        });
        
        localStorage.setItem('chatThreads', JSON.stringify(threadsData));
        setAllThreads(loadThreadsFromStorage());
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
    setShowDeleteConfirm(null);
  };
  
  // Start editing a thread title
  const startEditing = (thread, e) => {
    e.stopPropagation();
    setEditingThreadId(thread.id);
    setEditingTitle(thread.title);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingThreadId(null);
    setEditingTitle('');
  };
  
  const agents = [
    { id: 1, name: 'HR Assistant', type: 'hr', bgColor: '#44B8F3' },
    { id: 2, name: 'Jira Agent', type: 'jira' },
    { id: 3, name: 'Service Now Agent', type: 'servicenow' }
  ];

  return (
    <div className={`${isCollapsed ? 'w-[80px]' : 'w-[295px]'} ${isDarkMode ? 'bg-[#03112F]' : 'bg-white'} flex flex-col h-screen shadow-[0_20px_40px_0_rgba(0,47,189,0.10)] transition-all duration-300`}>
      {/* Fixed Top Section */}
      <div className="flex flex-col px-4 pt-6 pb-4 gap-6 flex-shrink-0">
        {/* Top Header */}
        <div className="flex h-10 items-center justify-between">
          {/* Logo - Hidden when collapsed */}
          {!isCollapsed && (
            <div className="flex-1">
              <svg width="162" height="23" viewBox="0 0 162 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.06779 9.46522L10.8003 21.3309C10.8528 21.5547 10.911 21.6206 10.9647 21.6666C11.0594 21.7479 11.1884 21.7785 11.3227 21.7785C11.4472 21.7846 11.534 21.7383 11.636 21.6666C11.7379 21.5949 11.849 21.4501 11.8853 21.3309L15.7121 10.7418H23.4121C23.781 10.7418 24.018 10.6272 24.2789 10.3663C24.5397 10.1054 24.7264 9.72825 24.7264 9.35934C24.7264 8.99042 24.5397 8.61324 24.2789 8.35238C24.018 8.09152 23.781 7.95985 23.4121 7.95985H14.757C14.4873 7.95995 14.2251 8.04819 14.0102 8.21114C13.7954 8.37409 13.6397 8.60281 13.5669 8.86245L11.7648 15.292L9.06262 2.08694C9.03931 1.96406 8.93299 1.83366 8.83885 1.75129C8.74472 1.66893 8.6281 1.6462 8.5032 1.63941C8.37863 1.63205 8.27051 1.68067 8.16755 1.75118C8.06458 1.82169 7.98196 1.96806 7.94378 2.08686L5.598 8.53479H1.391C1.02208 8.53479 0.668277 8.68135 0.407414 8.94221C0.146551 9.20307 0 9.55688 0 9.92579C0 10.2947 0.146551 10.6485 0.407414 10.9094C0.668277 11.1702 1.02208 11.3168 1.391 11.3168H6.47896C6.76814 11.3172 7.04991 11.2254 7.28337 11.0547C7.51683 10.8841 7.68982 10.6435 7.77723 10.3678L8.06779 9.46522Z" fill="#87D2F7"/>
                <path d="M58.428 19.0425L58.8024 21.9626L58.6278 22.0208C58.1438 22.1821 57.5237 22.3142 57.022 22.3142C56.0327 22.3142 55.0543 21.9837 54.3236 21.2278C53.5923 20.4713 53.1329 19.3136 53.1329 17.7046V0H56.3372V17.7359C56.3372 18.3534 56.5057 18.738 56.7254 18.9673C56.9452 19.1967 57.2424 19.2978 57.5545 19.2978C57.7359 19.2978 57.9562 19.2447 58.1556 19.1592L58.428 19.0425Z" fill="#2861BB"/>
                <path d="M41.0709 6.54746V15.073C41.0709 16.3462 41.442 17.3865 42.0727 18.1052C42.701 18.8212 43.6015 19.2351 44.7004 19.2351C45.8162 19.2351 46.7328 18.8203 47.3726 18.1038C48.0144 17.3849 48.3926 16.345 48.3926 15.073V6.54746H51.6283V15.2923C51.6283 17.3783 50.9455 19.1297 49.727 20.3604C48.5083 21.5913 46.772 22.2829 44.7004 22.2829C42.644 22.2829 40.9231 21.5909 39.7162 20.3596C38.5098 19.1287 37.8352 17.3775 37.8352 15.2923V6.54746H41.0709Z" fill="#2861BB"/>
                <path d="M21.6836 11.7076V22.0005H24.9506V14.6698H28.8621C31.2348 14.6698 33.2238 14.0249 34.624 12.8682C36.0282 11.7082 36.8238 10.0464 36.8238 8.05524C36.8238 6.06479 36.0365 4.41063 34.6437 3.25811C33.255 2.10898 31.2815 1.47198 28.9247 1.47198H21.6836V6.78473H24.9506V4.45705H29.1754C30.4661 4.45705 31.5311 4.82136 32.2693 5.44577C33.0041 6.06722 33.4314 6.95921 33.4314 8.05524C33.4314 9.15155 33.0039 10.0518 32.2684 10.6812C31.5298 11.3133 30.4649 11.6848 29.1754 11.6848L25.0625 11.7076H21.6836Z" fill="#2861BB"/>
                <path d="M70.0517 10.1616L70.2596 10.2778L71.5557 7.57458L71.3542 7.47767C69.7039 6.68425 68.0728 6.17111 65.9942 6.17111C62.2837 6.17111 60.1315 8.20265 60.1315 10.5928C60.1315 12.1069 60.6925 13.1271 61.5423 13.8447C62.3794 14.5514 63.484 14.9534 64.552 15.2714C64.8425 15.358 65.129 15.438 65.4077 15.5159L65.4083 15.5161L65.4086 15.5162C66.1732 15.7299 66.8792 15.9272 67.4495 16.1962C67.8335 16.3774 68.1339 16.5821 68.3378 16.8285C68.5374 17.0697 68.6526 17.3604 68.6526 17.7355C68.6526 18.2586 68.437 18.6902 67.9861 19C67.5246 19.317 66.8003 19.5167 65.7749 19.5167C64.1011 19.5167 62.6651 19.0315 60.9908 18.1634L60.7836 18.056L59.5343 20.7382L59.7087 20.8416C61.2792 21.771 63.3237 22.3765 65.587 22.3765C67.5331 22.3765 69.0971 21.89 70.1802 21.0531C71.2677 20.2128 71.857 19.028 71.857 17.6729C71.857 16.1816 71.2992 15.1769 70.4553 14.4694C69.6244 13.7729 68.5279 13.3749 67.4683 13.057C67.1935 12.9746 66.9224 12.8978 66.6582 12.8229L66.6579 12.8228C65.884 12.6035 65.1689 12.4008 64.5937 12.1232C64.213 11.9394 63.9147 11.7316 63.712 11.4817C63.5134 11.2367 63.3985 10.9415 63.3985 10.5615C63.3985 10.1036 63.6205 9.74157 64.0665 9.48229C64.5239 9.21638 65.2154 9.06229 66.1195 9.06229C67.5124 9.06229 69.0099 9.57945 70.0517 10.1616Z" fill="#2861BB"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M86.8791 19.9419L86.7502 20.0807C85.479 21.4497 83.2851 22.3765 80.822 22.3765C76.1193 22.3765 72.735 18.7309 72.735 14.2581C72.735 9.79532 75.9845 6.17111 80.3834 6.17111C84.7116 6.17111 88.0005 9.63024 88.0005 13.9762C88.0005 14.1695 87.9924 14.4098 87.9764 14.6307C87.9608 14.845 87.9363 15.0622 87.8979 15.1968L87.8515 15.3591H76.0706C76.4919 17.7276 78.3396 19.4541 80.916 19.4541C82.5504 19.4541 83.9966 18.8182 84.9556 17.8592L85.1357 17.6791L86.8791 19.9419ZM83.1469 10.0031C82.4236 9.34997 81.4914 8.99958 80.4147 8.99958C78.2826 8.99958 76.7049 10.4685 76.154 12.6247H84.587C84.3237 11.4915 83.8198 10.6109 83.1469 10.0031Z" fill="#2861BB"/>
              </svg>
            </div>
          )}

          {/* Menu Icon - Clickable, centered when collapsed */}
          <div className={`${isCollapsed ? 'flex justify-center w-full' : 'flex-shrink-0'}`}>
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 hover:opacity-70">
              <svg width="26" height="26" viewBox="0 0 42 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 8V32H34V8H8ZM10.1667 10.1818H17.75V29.8182H10.1667V10.1818ZM19.9167 10.1818H31.8333V29.8182H19.9167V10.1818Z" fill={isDarkMode ? '#FFF' : '#2861BB'}/>
              </svg>
            </button>
          </div>
        </div>

        {/* Back Button and Dark Mode Toggle - Hidden when collapsed */}
        {!isCollapsed && (
          <div className="flex items-start justify-between">
            {/* Back Button - Show if showBackButton is true or 'disabled' */}
            {(showBackButton === true || showBackButton === 'disabled') && (
              <button 
                className={`flex items-center gap-3 flex-1 ${showBackButton === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={showBackButton === true && onBack ? onBack : undefined}
                disabled={showBackButton === 'disabled'}
              >
                <ArrowLeft className="w-6 h-6" style={{ color: isDarkMode ? '#FFF' : '#2861BB' }} />
                <span style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '14px', fontWeight: 500, lineHeight: '150%' }}>
                  Back
                </span>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={() => {
                setIsDarkModeLocal(!isDarkModeLocal);
                if (onToggleTheme) onToggleTheme();
              }}
              className={`relative w-12 h-6 rounded-full border flex items-center transition-all ${(!showBackButton || showBackButton === 'disabled' || !onBack) ? 'ml-auto' : ''}`}
              style={{ borderColor: isDarkMode ? '#FFF' : '#1A3673', backgroundColor: isDarkMode ? '#444' : '#FFF' }}
            >
              {/* Toggle Circle */}
              <div
                className="absolute w-[19px] h-[19px] rounded-full transition-all"
                style={{
                  backgroundColor: isDarkMode ? '#FFF' : '#1A3673',
                  left: isDarkModeLocal ? 'calc(100% - 22px)' : '3px',
                  top: '2px'
                }}
              />
              {/* Sun Icon */}
              <Sun
                className="absolute w-5 h-5"
                style={{
                  color: isDarkMode ? '#FFF' : '#1A3673',
                  right: '2px',
                  top: '2px'
                }}
              />
            </button>
          </div>
        )}

        {/* Back button - Shown when collapsed and if showBackButton is true or disabled */}
        {isCollapsed && (showBackButton === true || showBackButton === 'disabled') && (
          <div className="flex justify-center">
            <button 
              onClick={showBackButton === true && onBack ? onBack : undefined}
              className={`p-2 hover:opacity-70 ${showBackButton === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={showBackButton === 'disabled'}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: isDarkMode ? '#FFF' : '#2861BB' }} />
            </button>
          </div>
        )}

        {/* Search Bar or Search Icon */}
        {isCollapsed ? (
          <div className="flex justify-center">
            <button onClick={handleSearchIconClick} className="p-2 hover:opacity-70">
              <Search className="w-5 h-5" style={{ color: isDarkMode ? '#FFF' : '#2861BB' }} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search previous threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: isDarkMode ? '#1F3E81' : '#FFF',
                color: isDarkMode ? '#FFF' : '#333',
                borderColor: isDarkMode ? '#444' : '#CCC'
              }}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: isDarkMode ? '#FFF' : '#949494' }} />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-80"
                style={{ color: isDarkMode ? '#FFF' : '#949494' }}
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="w-full h-px" style={{ backgroundColor: isDarkMode ? '#444' : '#CCC' }} />
      </div>

      {/* Scrollable Content Area */}
      <div 
        className="flex-1 overflow-y-auto px-4" 
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitScrollbar: 'none'
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {!isCollapsed && (
          <>
            {/* Agents Section - Hidden when searching */}
            {!isSearching && (
              <div className="flex flex-col items-center gap-2.5 px-2 mb-6">
            <div className="w-full" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '14px', fontWeight: 600, lineHeight: '16px' }}>
              Agents
            </div>

            {/* Agent Items */}
            {agents.map((agent) => (
            <button key={agent.id} className={`flex items-center gap-2 w-full p-2 rounded transition-colors ${isDarkMode ? 'hover:bg-[#1F3E81]' : 'hover:bg-gray-50'}`}>
              {/* Avatar */}
              {agent.type === 'hr' && (
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-full"
                  style={{ backgroundColor: agent.bgColor }}
                >
                  <span style={{ color: '#FFF', fontSize: '14px', fontWeight: 600, lineHeight: '16px' }}>
                    HR
                  </span>
                </div>
              )}
              {agent.type === 'jira' && <JiraIcon color={isDarkMode ? '#FFF' : '#2684FF'} />}
              {agent.type === 'servicenow' && <ServiceNowIcon color={isDarkMode ? '#FFF' : '#62D84E'} />}

              {/* Agent Name */}
              <span
                className="truncate"
                style={{
                  color: isDarkMode ? '#FFF' : '#2861BB',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '16px'
                }}
              >
                {agent.name}
              </span>
            </button>
          ))}
        </div>
        )}

        {/* Previous Threads Section */}
        <div className="flex flex-col items-start gap-4 mb-6">
          {/* Divider - Only show when not searching */}
          {!isSearching && (
            <div className="w-full h-px" style={{ backgroundColor: isDarkMode ? '#444' : '#CCC' }} />
          )}

          {/* Previous Threads Header */}
          <div className="flex items-center gap-2.5 w-full px-2">
            <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '14px', fontWeight: 600, lineHeight: '16px' }}>
              {isSearching ? `Search Results` : 'Previous Threads'}
            </div>
          </div>

          {/* Threads List */}
          <div className="flex flex-col items-start gap-6 w-full">
            {/* Today Section */}
            {filteredThreads.today.length > 0 && (
              <div className="flex flex-col items-start gap-1 w-full">
                <div className="flex items-center gap-2.5 w-full pl-2">
                  <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '12px', fontWeight: 600, lineHeight: '16px' }}>
                    Today ({filteredThreads.today.length})
                  </div>
                </div>

                {/* Thread Items */}
                <div className="flex flex-col items-start gap-2 w-full">
                  {filteredThreads.today.map((thread, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center gap-2 w-full p-2 rounded transition-colors group ${
                        currentActiveThread?.id === thread.id 
                          ? (isDarkMode ? 'bg-[#2861BB]' : 'bg-blue-100') 
                          : (isDarkMode ? 'hover:bg-[#1F3E81]' : 'hover:bg-gray-50')
                      }`}
                    >
                      <ChatIcon className="w-6 h-6 flex-shrink-0" color={isDarkMode ? "#FFF" : "#2861BB"} />
                      
                      {editingThreadId === thread.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameThread(thread.id, editingTitle);
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm border rounded"
                            style={{ 
                              background: isDarkMode ? '#1F3E81' : '#FFF',
                              color: isDarkMode ? '#FFF' : '#000',
                              border: `1px solid ${isDarkMode ? '#2861BB' : '#ccc'}`
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameThread(thread.id, editingTitle)}
                            className="p-1 hover:opacity-70"
                          >
                            <Check size={14} color={isDarkMode ? "#FFF" : "#2861BB"} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 hover:opacity-70"
                          >
                            <X size={14} color={isDarkMode ? "#FFF" : "#2861BB"} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            className="text-left flex-1 cursor-pointer"
                            onClick={() => onThreadSelect && onThreadSelect(thread)}
                            style={isDarkMode ? {
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              color: '#FFF',
                              textOverflow: 'ellipsis',
                              fontFamily: 'Elevance Sans',
                              fontSize: '14px',
                              fontStyle: 'normal',
                              fontWeight: 500,
                              lineHeight: '16px'
                            } : {
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              color: '#2861BB',
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
                          
                          {/* Action buttons - visible on hover */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => startEditing(thread, e)}
                              className="p-1 hover:opacity-70"
                              title="Rename conversation"
                            >
                              <Edit2 size={12} color={isDarkMode ? "#FFF" : "#2861BB"} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(thread.id);
                              }}
                              className="p-1 hover:opacity-70"
                              title="Delete conversation"
                            >
                              <Trash2 size={12} color={isDarkMode ? "#FFF" : "#2861BB"} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Yesterday Section */}
            {filteredThreads.yesterday.length > 0 && (
              <div className="flex flex-col items-start gap-1 w-full">
                <div className="flex items-center gap-2.5 w-full pl-2">
                  <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '12px', fontWeight: 600, lineHeight: '16px' }}>
                    Yesterday ({filteredThreads.yesterday.length})
                  </div>
                </div>

                {/* Thread Items */}
                <div className="flex flex-col items-start gap-2 w-full">
                  {filteredThreads.yesterday.map((thread, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center gap-2 w-full p-2 rounded transition-colors group ${
                        currentActiveThread?.id === thread.id 
                          ? (isDarkMode ? 'bg-[#2861BB]' : 'bg-blue-100') 
                          : (isDarkMode ? 'hover:bg-[#1F3E81]' : 'hover:bg-gray-50')
                      }`}
                    >
                      <ChatIcon className="w-6 h-6 flex-shrink-0" color={isDarkMode ? "#FFF" : "#2861BB"} />
                      
                      {editingThreadId === thread.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameThread(thread.id, editingTitle);
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm border rounded"
                            style={{ 
                              background: isDarkMode ? '#1F3E81' : '#FFF',
                              color: isDarkMode ? '#FFF' : '#000',
                              border: `1px solid ${isDarkMode ? '#2861BB' : '#ccc'}`
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameThread(thread.id, editingTitle)}
                            className="p-1 hover:opacity-70"
                          >
                            <Check size={14} color={isDarkMode ? "#FFF" : "#2861BB"} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 hover:opacity-70"
                          >
                            <X size={14} color={isDarkMode ? "#FFF" : "#2861BB"} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            className="text-left flex-1 cursor-pointer"
                            onClick={() => onThreadSelect && onThreadSelect(thread)}
                            style={isDarkMode ? {
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              color: '#FFF',
                              textOverflow: 'ellipsis',
                              fontFamily: 'Elevance Sans',
                              fontSize: '14px',
                              fontStyle: 'normal',
                              fontWeight: 500,
                              lineHeight: '16px'
                            } : {
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              color: '#2861BB',
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
                          
                          {/* Action buttons - visible on hover */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => startEditing(thread, e)}
                              className="p-1 hover:opacity-70"
                              title="Rename conversation"
                            >
                              <Edit2 size={12} color={isDarkMode ? "#FFF" : "#2861BB"} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(thread.id);
                              }}
                              className="p-1 hover:opacity-70"
                              title="Delete conversation"
                            >
                              <Trash2 size={12} color={isDarkMode ? "#FFF" : "#2861BB"} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Week Section */}
            <div className="flex flex-col items-start gap-1 w-full">
              <div className="flex items-center gap-2.5 w-full pl-2">
                <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '12px', fontWeight: 600, lineHeight: '16px' }}>
                  Last week ({filteredThreads.lastWeek.length})
                </div>
              </div>

              {/* Thread Items */}
              <div className="flex flex-col items-start gap-2 w-full">
                {filteredThreads.lastWeek.map((thread, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-2 w-full p-2 rounded transition-colors group ${
                      currentActiveThread?.id === thread.id 
                        ? (isDarkMode ? 'bg-[#2861BB]' : 'bg-blue-100') 
                        : (isDarkMode ? 'hover:bg-[#1F3E81]' : 'hover:bg-gray-50')
                    }`}
                  >
                    <ChatIcon className="w-6 h-6 flex-shrink-0" color={isDarkMode ? "#FFF" : "#2861BB"} />
                    
                    {editingThreadId === thread.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameThread(thread.id, editingTitle);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border rounded"
                          style={{ 
                            background: isDarkMode ? '#1F3E81' : '#FFF',
                            color: isDarkMode ? '#FFF' : '#000',
                            border: `1px solid ${isDarkMode ? '#2861BB' : '#ccc'}`
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameThread(thread.id, editingTitle)}
                          className="p-1 hover:opacity-70"
                        >
                          <Check size={14} color={isDarkMode ? "#FFF" : "#2861BB"} />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1 hover:opacity-70"
                        >
                          <X size={14} color={isDarkMode ? "#FFF" : "#2861BB"} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className="text-left flex-1 cursor-pointer"
                          onClick={() => onThreadSelect && onThreadSelect(thread)}
                          style={isDarkMode ? {
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            color: '#FFF',
                            textOverflow: 'ellipsis',
                            fontFamily: 'Elevance Sans',
                            fontSize: '14px',
                            fontStyle: 'normal',
                            fontWeight: 500,
                            lineHeight: '16px'
                          } : {
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            color: '#2861BB',
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
                        
                        {/* Action buttons - visible on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => startEditing(thread, e)}
                            className="p-1 hover:opacity-70"
                            title="Rename conversation"
                          >
                            <Edit2 size={12} color={isDarkMode ? "#FFF" : "#2861BB"} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(thread.id);
                            }}
                            className="p-1 hover:opacity-70"
                            title="Delete conversation"
                          >
                            <Trash2 size={12} color={isDarkMode ? "#FFF" : "#2861BB"} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Last 30 Days Section */}
            <div className="flex flex-col items-start gap-1 w-full">
              <div className="flex items-center gap-2.5 w-full pl-2">
                <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '12px', fontWeight: 600, lineHeight: '16px' }}>
                  Last 30 days ({filteredThreads.last30Days.length})
                </div>
              </div>

              {/* Thread Items */}
              <div className="flex flex-col items-start gap-2 w-full">
                {filteredThreads.last30Days.map((thread, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-2 w-full p-2 rounded transition-colors group ${
                      currentActiveThread?.id === thread.id 
                        ? (isDarkMode ? 'bg-[#2861BB]' : 'bg-blue-100') 
                        : (isDarkMode ? 'hover:bg-[#1F3E81]' : 'hover:bg-gray-50')
                    }`}
                  >
                    <ChatIcon className="w-6 h-6 flex-shrink-0" color={isDarkMode ? "#FFF" : "#2861BB"} />
                    
                    {editingThreadId === thread.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameThread(thread.id, editingTitle);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border rounded"
                          style={{ 
                            background: isDarkMode ? '#1F3E81' : '#FFF',
                            color: isDarkMode ? '#FFF' : '#000',
                            border: `1px solid ${isDarkMode ? '#2861BB' : '#ccc'}`
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameThread(thread.id, editingTitle)}
                          className="p-1 hover:opacity-70"
                        >
                          <Check size={14} color={isDarkMode ? "#FFF" : "#2861BB"} />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1 hover:opacity-70"
                        >
                          <X size={14} color={isDarkMode ? "#FFF" : "#2861BB"} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className="text-left flex-1 cursor-pointer"
                          onClick={() => onThreadSelect && onThreadSelect(thread)}
                          style={isDarkMode ? {
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            color: '#FFF',
                            textOverflow: 'ellipsis',
                            fontFamily: 'Elevance Sans',
                            fontSize: '14px',
                            fontStyle: 'normal',
                            fontWeight: 500,
                            lineHeight: '16px'
                          } : {
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            color: '#2861BB',
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
                        
                        {/* Action buttons - visible on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => startEditing(thread, e)}
                            className="p-1 hover:opacity-70"
                            title="Rename conversation"
                          >
                            <Edit2 size={12} color={isDarkMode ? "#FFF" : "#2861BB"} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(thread.id);
                            }}
                            className="p-1 hover:opacity-70"
                            title="Delete conversation"
                          >
                            <Trash2 size={12} color={isDarkMode ? "#FFF" : "#2861BB"} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* No results message */}
        {isSearching && filteredThreads.today.length === 0 && filteredThreads.yesterday.length === 0 && filteredThreads.lastWeek.length === 0 && filteredThreads.last30Days.length === 0 && (
          <div className="text-center py-8">
            <div className="text-sm" style={{ color: isDarkMode ? '#FFF' : '#949494' }}>
              No threads found matching "{searchQuery}"
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs hover:underline"
              style={{ color: isDarkMode ? '#FFF' : '#2861BB' }}
            >
              Clear search
            </button>
          </div>
        )}
          </>
        )}
      </div>

      {/* New Chat Button - Fixed at Bottom */}
      <div
        className="flex h-[66px] items-center justify-center px-3 py-3 border-t flex-shrink-0"
        style={{ borderColor: isDarkMode ? '#444' : '#CCC', backgroundColor: isDarkMode ? '#03112F' : '#FFF' }}
      >
        <button
          onClick={() => onNewChat && onNewChat()}
          disabled={isNewChatActive}
          className={`flex items-center justify-center gap-1 transition-colors ${
            isCollapsed ? 'w-10 h-10 rounded' : 'w-full h-10 rounded'
          } ${
            isNewChatActive 
              ? 'bg-gray-300 cursor-not-allowed' 
              : (isDarkMode ? 'bg-white hover:bg-gray-100' : 'bg-[#2861BB] hover:bg-[#1f4a9c]')
          }`}
        >
          <Plus 
            className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} 
            style={{ 
              color: isCollapsed 
                ? (isDarkMode ? '#2861BB' : '#FFF')
                : (isNewChatActive ? '#999' : (isDarkMode ? '#2861BB' : '#FFF'))
            }} 
          />
          {!isCollapsed && (
            <span style={{ color: isNewChatActive ? '#999' : (isDarkMode ? '#2861BB' : '#FFF'), fontSize: '14px', fontWeight: 600 }}>
              {isNewChatActive ? 'New chat' : 'New chat'}
            </span>
          )}
        </button>
      </div>
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className="p-4 rounded-lg shadow-lg max-w-sm mx-4"
            style={{
              background: isDarkMode ? '#1F3E81' : '#FFF',
              border: `1px solid ${isDarkMode ? '#2861BB' : '#ccc'}`
            }}
          >
            <h3 
              className="text-lg font-semibold mb-3"
              style={{ color: isDarkMode ? '#FFF' : '#000' }}
            >
              Delete Conversation
            </h3>
            <p 
              className="text-sm mb-4"
              style={{ color: isDarkMode ? '#A0BEEA' : '#666' }}
            >
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-3 py-1 rounded text-sm"
                style={{
                  background: isDarkMode ? '#2861BB' : '#F0F0F0',
                  color: isDarkMode ? '#FFF' : '#000'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteThread(showDeleteConfirm)}
                className="px-3 py-1 rounded text-sm"
                style={{
                  background: '#DC2626',
                  color: '#FFF'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuSidebar;
