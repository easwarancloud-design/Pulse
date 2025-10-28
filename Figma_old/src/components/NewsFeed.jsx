import React, { useState } from 'react';

const NewsFeed = () => {
  const [activeTab, setActiveTab] = useState('enterprise');
  const [viewMode, setViewMode] = useState('list');

  const newsItems = [
    {
      id: 1,
      title: 'Carelon Impact Ambassadors Program Reaches New Milestones',
      description: 'The Carelon Impact Ambassadors Program (CIAP) began in 2024 with a simple mission: to encourage and  ... ',
      date: 'Oct 8',
      tag: '#human resources',
      likes: 14,
      comments: 3,
      image: 'https://api.builder.io/api/v1/image/assets/TEMP/ebd7a15ac97a68935581722337619bd074641600?width=561',
      isNew: true
    },
    {
      id: 2,
      title: 'New Cancer Care Program Designed for the Whole Person',
      description: 'A cancer diagnosis can be a scary experience, leaving a patient — and often their caregivers — overwh ... ',
      date: 'Oct 2',
      tag: '#Carelon',
      likes: 14,
      comments: 3,
      image: 'https://api.builder.io/api/v1/image/assets/TEMP/ca400ee04435282336679829b4622a74f4ed3fa8?width=561',
      isNew: true
    },
    {
      id: 3,
      title: 'The Risk Rundown: Eyes on the Horizon',
      description: 'In episode 3: "Eyes on the Horizon" of The Risk Rundown, Jamie and Taylor tackle another topic: Insuffici... ',
      date: 'Oct 2',
      tag: '#Tag',
      likes: 14,
      comments: 3,
      image: 'https://api.builder.io/api/v1/image/assets/TEMP/320dd4bf48e2ee6443c323e4f5bdb7d3ec9b5a63?width=561',
      isNew: true
    },
    {
      id: 4,
      title: 'Elevance Health\'s AI Platform: Accelerating AI Innovation Responsibly',
      description: 'Artificial intelligence is transforming how we work. Elevance Health is leading the way with the launch of our AI Platform, designed to empower faster, smarter innovation... ',
      date: 'Oct 2',
      tag: '#Tag',
      likes: 14,
      comments: 3,
      isNew: false
    },
    {
      id: 5,
      title: 'Exemplifying Our Values',
      subtitle: 'Recognize your Peers',
      description: 'IMPACT is where we come together to celebrate all the big wins and everyday efforts by the 100,000 associates who go above and beyond, each day.',
      tag: 'Stay Involved',
      tagColor: 'turquoise',
      hasButton: true,
      buttonText: 'Recognize someone today'
    },
  ];

  return (
    <div 
      className="flex flex-col items-start gap-6 bg-white"
      style={{
        width: '752px',
        padding: '16px 24px',
        borderRadius: '8px 8px 8px 0'
      }}
    >
      <div 
        className="flex items-center gap-7.5 w-full"
        style={{
          background: '#FFF',
          boxShadow: '0 -1px 0 0 #D1D1D4 inset'
        }}
      >
        <div 
          className={`flex items-start p-4 cursor-pointer ${activeTab === 'enterprise' ? 'shadow-[0_-4px_0_0_#1E58AA_inset]' : ''}`}
          onClick={() => setActiveTab('enterprise')}
          style={{
            background: '#FFF'
          }}
        >
          <div 
            style={{
              color: activeTab === 'enterprise' ? '#2F57A4' : '#5B5E62',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '18px',
              fontWeight: activeTab === 'enterprise' ? '600' : '500',
              lineHeight: '150%'
            }}
          >
            Enterprise News
          </div>
        </div>
        <div 
          className="flex items-start p-4 cursor-pointer"
          onClick={() => setActiveTab('my')}
        >
          <div 
            style={{
              color: '#5B5E62',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '18px',
              fontWeight: '500',
              lineHeight: '150%'
            }}
          >
            My News
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center w-full">
        <div className="flex flex-col items-start gap-4 flex-1">
          <div 
            className="flex items-center gap-2 px-3 py-2 w-full max-w-[523px]"
            style={{
              height: '32px',
              borderRadius: '100px',
              border: '1px solid #44B8F3'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 16C6.9701 12.0864 3.91363 9.0299 0 8C3.91363 6.9701 6.9701 3.91363 8 0C9.0299 3.91363 12.0864 6.9701 16 8C12.0864 9.0299 9.0299 12.0864 8 16Z" fill="url(#paint0_linear_search)"/>
              <defs>
                <linearGradient id="paint0_linear_search" x1="2.74286" y1="14.1714" x2="13.4857" y2="2.97143" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#44B8F3"/>
                  <stop offset="1" stopColor="#2861BB"/>
                </linearGradient>
              </defs>
            </svg>
            <div 
              style={{
                color: '#757182',
                fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                fontSize: '16px',
                fontWeight: '500',
                lineHeight: 'normal'
              }}
            >
              Search for News
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div 
            className={`flex items-center justify-center p-2 cursor-pointer ${viewMode === 'list' ? 'bg-[#2F57A4]' : ''}`}
            onClick={() => setViewMode('list')}
            style={{
              borderRadius: '4px'
            }}
          >
            <div className="flex flex-col justify-between items-start w-5 h-5">
              <div className="h-0.5 w-full bg-white"></div>
              <div className="h-0.5 w-full bg-white"></div>
              <div className="h-0.5 w-full bg-white"></div>
              <div className="h-0.5 w-full bg-white"></div>
            </div>
          </div>
          <div 
            className={`flex items-center justify-center p-2 cursor-pointer ${viewMode === 'card' ? 'bg-[#2F57A4]' : ''}`}
            onClick={() => setViewMode('card')}
            style={{
              borderRadius: '4px'
            }}
          >
            <div className="flex flex-col items-start gap-0.5 w-5 h-5">
              <div className="flex-1 w-full border-2 border-[#757182]"></div>
              <div className="flex-1 w-full border-2 border-[#757182]"></div>
            </div>
          </div>
        </div>
      </div>

      {newsItems.map((item, index) => (
        <React.Fragment key={item.id}>
          {item.image ? (
            <div className="flex items-start gap-4 w-full">
              <div className="relative" style={{ width: '244px', height: '135px' }}>
                <div 
                  className="absolute"
                  style={{
                    width: '244px',
                    height: '135px',
                    borderRadius: '8px',
                    background: '#D9D9D9'
                  }}
                ></div>
                <img 
                  className="absolute"
                  style={{
                    width: '280px',
                    height: '139px',
                    left: '-36px',
                    top: '-3px'
                  }}
                  src={item.image} 
                  alt={item.title} 
                />
                {item.isNew && (
                  <div 
                    className="absolute flex items-center justify-center"
                    style={{
                      width: '62px',
                      height: '24px',
                      padding: '2px 8px',
                      borderRadius: '0 4px 4px 0',
                      background: '#1A3673',
                      left: '0',
                      top: '8px'
                    }}
                  >
                    <div 
                      style={{
                        color: '#FFF',
                        fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                        fontSize: '16px',
                        fontWeight: '600',
                        lineHeight: '20px',
                        letterSpacing: '0.96px',
                        textTransform: 'uppercase'
                      }}
                    >
                      New
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-between items-start flex-1">
                <div className="flex flex-col items-start gap-1 w-full">
                  <div 
                    className="w-full"
                    style={{
                      color: '#333',
                      fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '16px',
                      fontWeight: '600',
                      lineHeight: '24px'
                    }}
                  >
                    {item.title}
                  </div>
                  <div 
                    className="w-full overflow-hidden"
                    style={{
                      height: '47px',
                      color: '#333',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '16px',
                      fontWeight: '600',
                      lineHeight: '24px'
                    }}
                  >
                    {item.description} <span style={{ color: '#2861BB', textDecoration: 'underline' }}>Read More</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-[341px]">
                  <div 
                    style={{
                      color: '#333',
                      fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '18px',
                      fontWeight: '600',
                      lineHeight: '24px'
                    }}
                  >
                    {item.date}
                  </div>
                  <div 
                    className="flex items-center justify-center px-2 py-0.5"
                    style={{
                      height: '24px',
                      borderRadius: '4px',
                      background: '#E3F4FD'
                    }}
                  >
                    <div 
                      style={{
                        color: '#231E33',
                        fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                        fontSize: '16px',
                        fontWeight: '600',
                        lineHeight: '20px',
                        letterSpacing: '0.96px',
                        textTransform: 'uppercase'
                      }}
                    >
                      {item.tag}
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-1 py-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.62234 1.62331L4.98554 5.24353C4.74265 5.48531 4.60479 5.81858 4.60479 6.16492V12.6931C4.60479 13.4119 5.19561 14 5.91771 14H11.8259C12.351 14 12.8237 13.6863 13.0338 13.2093L15.1738 8.23641C15.7253 6.94254 14.7734 5.50492 13.362 5.50492H9.65298L10.2766 2.51203C10.3423 2.1853 10.2438 1.85203 10.0075 1.61678C9.62016 1.23777 9.00309 1.23777 8.62234 1.62331ZM1.97894 14C2.70105 14 3.29186 13.4119 3.29186 12.6931V7.46532C3.29186 6.7465 2.70105 6.15838 1.97894 6.15838C1.25683 6.15838 0.666016 6.7465 0.666016 7.46532V12.6931C0.666016 13.4119 1.25683 14 1.97894 14Z" fill="#2F57A4"/>
                      </svg>
                      <div 
                        style={{
                          color: '#2F57A4',
                          fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                          fontSize: '14px',
                          fontWeight: '400',
                          lineHeight: '16px'
                        }}
                      >
                        {item.likes}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 py-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.6673 2.66667C14.6673 1.93333 14.0673 1.33333 13.334 1.33333H2.66732C1.93398 1.33333 1.33398 1.93333 1.33398 2.66667V10.6667C1.33398 11.4 1.93398 12 2.66732 12H12.0007L14.6673 14.6667V2.66667Z" fill="#2F57A4"/>
                      </svg>
                      <div 
                        style={{
                          color: '#2F57A4',
                          fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                          fontSize: '14px',
                          fontWeight: '400',
                          lineHeight: '16px'
                        }}
                      >
                        {item.comments}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 w-full">
              <div className="flex flex-col items-start gap-2 flex-1">
                <div className="flex flex-col items-start gap-1 w-full">
                  <div 
                    className="w-full"
                    style={{
                      color: '#333',
                      fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '16px',
                      fontWeight: '600',
                      lineHeight: '24px'
                    }}
                  >
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div 
                      className="w-full"
                      style={{
                        color: '#333',
                        fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                        fontSize: '16px',
                        fontWeight: '500',
                        lineHeight: '24px'
                      }}
                    >
                      {item.subtitle}
                    </div>
                  )}
                  <div 
                    className="w-full overflow-hidden"
                    style={{
                      color: '#231E33',
                      fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '16px',
                      fontWeight: '500',
                      lineHeight: '24px',
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2
                    }}
                  >
                    {item.description}
                  </div>
                </div>
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-4">
                    {item.date && (
                      <div 
                        style={{
                          color: '#333',
                          fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                          fontSize: '18px',
                          fontWeight: '600',
                          lineHeight: '24px'
                        }}
                      >
                        {item.date}
                      </div>
                    )}
                    <div 
                      className="flex items-center justify-center px-2 py-0.5"
                      style={{
                        height: '24px',
                        borderRadius: '4px',
                        background: item.tagColor === 'turquoise' ? '#D9F5F5' : '#E3F4FD'
                      }}
                    >
                      <div 
                        style={{
                          color: item.tagColor === 'turquoise' ? '#028283' : '#231E33',
                          fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                          fontSize: '16px',
                          fontWeight: '600',
                          lineHeight: '20px',
                          letterSpacing: '0.96px',
                          textTransform: 'uppercase'
                        }}
                      >
                        {item.tag}
                      </div>
                    </div>
                    {item.likes && (
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-1 py-2">
                          <div 
                            style={{
                              color: '#2F57A4',
                              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                              fontSize: '14px',
                              fontWeight: '400',
                              lineHeight: '16px'
                            }}
                          >
                            {item.likes}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 py-2">
                          <div 
                            style={{
                              color: '#2F57A4',
                              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                              fontSize: '14px',
                              fontWeight: '400',
                              lineHeight: '16px'
                            }}
                          >
                            {item.comments}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {item.hasButton && (
                    <div 
                      className="flex items-center justify-center px-6 py-2 cursor-pointer"
                      style={{
                        borderRadius: '8px',
                        background: '#2F57A4'
                      }}
                    >
                      <div 
                        style={{
                          color: '#FFF',
                          fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                          fontSize: '14px',
                          fontWeight: '600',
                          lineHeight: '16px'
                        }}
                      >
                        {item.buttonText}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {index < newsItems.length - 1 && (
            <div className="flex items-start gap-2.5 w-full">
              <div className="w-full h-0.5 bg-[#C7EAFB]"></div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default NewsFeed;
