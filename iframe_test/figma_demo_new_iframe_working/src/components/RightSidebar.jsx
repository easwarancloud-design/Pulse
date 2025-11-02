import React from 'react';

const RightSidebar = () => {
  return (
    <div className="flex flex-col items-start gap-6" style={{ width: '408px' }}>
      <div 
        className="flex flex-col items-start gap-4 w-full p-5"
        style={{
          borderRadius: '8px',
          background: '#E3F4FD'
        }}
      >
        <div className="flex justify-between items-center w-full">
          <div 
            style={{
              color: '#231E33',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '18px',
              fontWeight: '600',
              lineHeight: '150%'
            }}
          >
            Todays Reminders
          </div>
          <div 
            className="cursor-pointer"
            style={{
              color: '#2861BB',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '18px',
              fontWeight: '600',
              lineHeight: '150%',
              textDecoration: 'underline'
            }}
          >
            View More
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          <div className="flex justify-between items-start w-full">
            <div 
              style={{
                width: '280px',
                color: '#333',
                fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                fontSize: '16px',
                fontWeight: '500',
                lineHeight: '150%'
              }}
            >
              Don't forget to enroll in your benefits!
            </div>
            <div 
              className="flex items-center justify-center px-2 py-1"
              style={{
                borderRadius: '2px',
                background: '#D04348'
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
                OCT 2
              </div>
            </div>
          </div>
          <div 
            className="cursor-pointer"
            style={{
              color: '#2861BB',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '16px',
              fontWeight: '600',
              lineHeight: '150%',
              textDecoration: 'underline'
            }}
          >
            Enroll Now
          </div>
        </div>

        <div className="flex items-start gap-2.5 w-full">
          <div className="w-full h-0.5 bg-[#C7EAFB]"></div>
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          <div className="flex justify-between items-start w-full">
            <div 
              style={{
                width: '280px',
                color: '#333',
                fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                fontSize: '16px',
                fontWeight: '500',
                lineHeight: '150%'
              }}
            >
              Complete Peakon Employee Survey
            </div>
            <div 
              className="flex items-center justify-center px-2 py-1"
              style={{
                borderRadius: '2px',
                background: '#C7EAFB'
              }}
            >
              <div 
                style={{
                  color: '#333',
                  fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                  fontSize: '14px',
                  fontWeight: '600',
                  lineHeight: '16px'
                }}
              >
                OCT 4
              </div>
            </div>
          </div>
          <div 
            className="cursor-pointer"
            style={{
              color: '#2861BB',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '16px',
              fontWeight: '600',
              lineHeight: '150%',
              textDecoration: 'underline'
            }}
          >
            Complete Survey
          </div>
        </div>
      </div>

      <div 
        className="flex flex-col items-start gap-6 w-full p-5"
        style={{
          borderRadius: '8px',
          background: '#FFF'
        }}
      >
        <div className="flex justify-between items-center w-full">
          <div 
            style={{
              color: '#231E33',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '18px',
              fontWeight: '600',
              lineHeight: '150%'
            }}
          >
            Today at a Glance (09/12)
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 w-full bg-white">
          <div className="flex flex-col items-start gap-3 w-full">
            <div className="flex items-start gap-3.5 w-full">
              <div 
                style={{
                  color: '#231E33',
                  fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                  fontSize: '16px',
                  fontWeight: '600',
                  lineHeight: '150%'
                }}
              >
                07 AM
              </div>
              <div 
                className="cursor-pointer"
                style={{
                  width: '283px',
                  color: '#2861BB',
                  fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                  fontSize: '16px',
                  fontWeight: '600',
                  lineHeight: '150%'
                }}
              >
                Elevate Your Whole Health: 'Rise and Shine' Yoga in the Courtyard
              </div>
            </div>
            <div className="flex items-start gap-2.5 w-full">
              <div className="w-full h-0.5 bg-[#C7EAFB]"></div>
            </div>
            <div className="flex items-start gap-3.5 w-full">
              <div 
                style={{
                  color: '#231E33',
                  fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                  fontSize: '16px',
                  fontWeight: '600',
                  lineHeight: '150%'
                }}
              >
                11 AM
              </div>
              <div 
                className="cursor-pointer"
                style={{
                  width: '283px',
                  color: '#2861BB',
                  fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                  fontSize: '16px',
                  fontWeight: '600',
                  lineHeight: '150%'
                }}
              >
                Gourmet on Wheels – Lunch at Work Experience
              </div>
            </div>
            <div className="flex items-start gap-2.5 w-full">
              <div className="w-full h-0.5 bg-[#C7EAFB]"></div>
            </div>
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-3.5">
                <div 
                  style={{
                    color: '#231E33',
                    fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                    fontSize: '16px',
                    fontWeight: '600',
                    lineHeight: '150%'
                  }}
                >
                  01 PM
                </div>
                <div 
                  className="cursor-pointer"
                  style={{
                    color: '#2861BB',
                    fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                    fontSize: '16px',
                    fontWeight: '600',
                    lineHeight: '150%'
                  }}
                >
                  Be a Hero: Corporate Blood Drive
                </div>
              </div>
              <div className="flex items-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.9987 8.66666H8.66536V12C8.66536 12.3667 8.36536 12.6667 7.9987 12.6667C7.63203 12.6667 7.33203 12.3667 7.33203 12V8.66666H3.9987C3.63203 8.66666 3.33203 8.36666 3.33203 8C3.33203 7.63333 3.63203 7.33333 3.9987 7.33333H7.33203V3.99999C7.33203 3.63333 7.63203 3.33333 7.9987 3.33333C8.36536 3.33333 8.66536 3.63333 8.66536 3.99999V7.33333H11.9987C12.3654 7.33333 12.6654 7.63333 12.6654 8C12.6654 8.36666 12.3654 8.66666 11.9987 8.66666Z" fill="#2F57A4"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div 
        className="flex flex-col items-start gap-6 w-full p-5"
        style={{
          borderRadius: '8px',
          background: '#FFF'
        }}
      >
        <div className="flex items-center justify-between w-full px-4">
          <div 
            style={{
              color: '#231E33',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '18px',
              fontWeight: '600',
              lineHeight: '150%'
            }}
          >
            Events Calendar
          </div>
          <div 
            className="flex items-center gap-2 px-3 py-2"
            style={{
              borderRadius: '100px',
              border: '1px solid #44B8F3'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 16C6.9701 12.0864 3.91363 9.0299 0 8C3.91363 6.9701 6.9701 3.91363 8 0C9.0299 3.91363 12.0864 6.9701 16 8C12.0864 9.0299 9.0299 12.0864 8 16Z" fill="url(#paint0_linear_events)"/>
              <defs>
                <linearGradient id="paint0_linear_events" x1="2.74286" y1="14.1714" x2="13.4857" y2="2.97143" gradientUnits="userSpaceOnUse">
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
              Search for Events 
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 px-4">
          <div 
            className="flex items-start gap-4 w-full p-3"
            style={{
              height: '86px',
              borderRadius: '8px',
              background: '#E3F4FD'
            }}
          >
            <div className="flex flex-col items-start flex-1">
              <div 
                className="cursor-pointer"
                style={{
                  width: '283px',
                  color: '#2861BB',
                  fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                  fontSize: '16px',
                  fontWeight: '600',
                  lineHeight: '22px'
                }}
              >
                Powering Our Potential: Transformation Touchpoint
              </div>
              <div className="flex items-start gap-2.5">
                <div 
                  style={{
                    color: '#000',
                    textAlign: 'center',
                    fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                    fontSize: '12px',
                    fontWeight: '600',
                    lineHeight: '22px'
                  }}
                >
                  Sep 25, 2025
                </div>
                <div 
                  style={{
                    color: '#000',
                    textAlign: 'center',
                    fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                    fontSize: '12px',
                    fontWeight: '600',
                    lineHeight: '22px'
                  }}
                >
                  11:15AM
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 w-full px-4">
          <div 
            className="w-full"
            style={{
              color: '#5B5E62',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '16px',
              fontWeight: '600',
              lineHeight: '150%'
            }}
          >
            September '25
          </div>
          <div className="flex flex-col items-start gap-4 w-full">
            <div className="flex items-start gap-4 w-full">
              <div className="flex flex-col items-center w-6">
                <div 
                  className="w-full text-center"
                  style={{
                    color: '#000',
                    fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                    fontSize: '20px',
                    fontWeight: '600',
                    lineHeight: '22px'
                  }}
                >
                  22
                </div>
                <div 
                  className="text-center"
                  style={{
                    color: '#000',
                    fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                    fontSize: '12px',
                    fontWeight: '600',
                    lineHeight: '22px'
                  }}
                >
                  Mon
                </div>
              </div>
              <div className="flex flex-col items-start gap-4 flex-1">
                <div className="flex items-start gap-3.5 w-full">
                  <div 
                    style={{
                      color: '#231E33',
                      fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '16px',
                      fontWeight: '600',
                      lineHeight: '150%'
                    }}
                  >
                    11 AM
                  </div>
                  <div 
                    className="flex-1 cursor-pointer"
                    style={{
                      color: '#2861BB',
                      fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '16px',
                      fontWeight: '600',
                      lineHeight: '22px'
                    }}
                  >
                    Office Hours: Intelligent Assistant Tools (Spark + ChatGPT Enterprise)
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full h-px bg-[#8FD4F8]"></div>
          </div>
        </div>

        <div className="w-full h-px bg-[#8FD4F8]"></div>

        <div className="flex flex-col items-start gap-3 w-full px-4">
          <div 
            className="w-full"
            style={{
              color: '#5B5E62',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '16px',
              fontWeight: '600',
              lineHeight: '150%'
            }}
          >
            October '25
          </div>
          <div className="flex flex-col items-start gap-4 w-full">
            <div className="flex items-start gap-4 w-full">
              <div className="flex flex-col items-center w-6">
                <div 
                  className="w-full text-center"
                  style={{
                    color: '#000',
                    fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                    fontSize: '20px',
                    fontWeight: '600',
                    lineHeight: '22px'
                  }}
                >
                  02
                </div>
                <div 
                  className="text-center"
                  style={{
                    color: '#000',
                    fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                    fontSize: '12px',
                    fontWeight: '600',
                    lineHeight: '22px'
                  }}
                >
                  Thu
                </div>
              </div>
              <div className="flex flex-col items-start gap-4 flex-1">
                <div className="flex items-start gap-3.5 w-full">
                  <div 
                    style={{
                      color: '#231E33',
                      fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '16px',
                      fontWeight: '600',
                      lineHeight: '150%'
                    }}
                  >
                    11 AM
                  </div>
                  <div 
                    className="flex-1 cursor-pointer"
                    style={{
                      color: '#2861BB',
                      fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '16px',
                      fontWeight: '600',
                      lineHeight: '22px'
                    }}
                  >
                    Lunch & Learn: "Workplace Security Awareness"
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full h-px bg-[#8FD4F8]"></div>
          </div>
        </div>
      </div>

      <div 
        className="flex flex-col items-start gap-6 w-full p-6"
        style={{
          borderRadius: '8px',
          background: '#FFF'
        }}
      >
        <div className="flex flex-col items-start gap-2 w-full">
          <div 
            style={{
              color: '#231E33',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '18px',
              fontWeight: '600',
              lineHeight: '150%'
            }}
          >
            Site Information
          </div>
          <div 
            className="cursor-pointer"
            style={{
              color: '#2861BB',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '14px',
              fontWeight: '600',
              lineHeight: '16.045px'
            }}
          >
            Your Feedback on Pulse
          </div>
          <div 
            className="cursor-pointer"
            style={{
              color: '#2861BB',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '14px',
              fontWeight: '600',
              lineHeight: '16.045px'
            }}
          >
            Need Help with Pulse?
          </div>
          <div 
            className="cursor-pointer"
            style={{
              color: '#2861BB',
              fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '14px',
              fontWeight: '600',
              lineHeight: '16.045px'
            }}
          >
            Pulse Guide to Collaboration
          </div>
        </div>

        <div 
          style={{
            color: '#231E33',
            fontFamily: 'Elevance Sans, -apple-system, Roboto, Helvetica, sans-serif',
            fontSize: '14px',
            fontWeight: '400',
            lineHeight: '16.045px'
          }}
        >
          Stay connected anytime, anywhere with Pulse
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
