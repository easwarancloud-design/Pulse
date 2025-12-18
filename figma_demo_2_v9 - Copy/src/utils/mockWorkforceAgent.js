// Mock workforce agent responses for testing when API is not accessible
export const mockWorkforceResponses = {
  "hello": `Hello! I'm your Workforce Agent assistant. I can help you with:

• **HR inquiries** - Leave requests, benefits, policies
• **IT support** - Service tickets, access issues, software problems  
• **Training** - Course enrollment, completion tracking, certifications
• **Project updates** - Status reports, milestone tracking, team information
• **ServiceNow integration** - Ticket creation, status checking
• **Confluence documentation** - Finding documents, policy searches

What would you like assistance with today?`,

  "training": `Based on our latest training records, here's the current status for your team's **Cyber Security Training 2025**:

**Training Completion Summary:**
• Total team members: 24
• Completed training: 19 (79%)
• Pending completion: 5 (21%)

**Employees requiring completion:**
1. Deepl, Priya (AGT23456) - Not Started
2. Garcia, Sophia (AGT23457) - Not Started  
3. Johnson, Alex (AGT23458) - In Progress (50%)
4. Lin, Marco (AGT23459) - Not Started
5. Miller, Ethan (AGT23460) - Not Started

**Next Steps:**
• Automated reminders will be sent to pending employees
• Training deadline: December 15, 2025
• Manager escalation: December 1, 2025

Would you like me to send reminder notifications or schedule additional training sessions?`,

  "ticket": `I'll help you create an IT service ticket. Here's what I need:

**Required Information:**
1. **Issue Category** (select one):
   • Hardware Problem
   • Software Issue  
   • Access Request
   • Network Connectivity
   • Other

2. **Priority Level**:
   • Low (within 5 business days)
   • Medium (within 2 business days)
   • High (within 24 hours)
   • Critical (within 4 hours)

3. **Detailed Description** of the issue
4. **Department/Location**
5. **Contact Information**

**Example Ticket Creation:**
Once you provide the details, I'll create a ServiceNow ticket and provide you with a ticket number for tracking. Average resolution times:
• Low: 3-5 days
• Medium: 1-2 days  
• High: 4-8 hours
• Critical: 1-4 hours

Please provide the issue details and I'll process your request immediately.`,

  "confluence": `I've searched our Confluence documentation and found several relevant resources:

**📚 Most Recent Documents:**
• **Employee Handbook 2025** - Updated Oct 2025
• **IT Security Policies** - Updated Sep 2025  
• **Remote Work Guidelines** - Updated Aug 2025
• **Benefits Enrollment Guide** - Updated Nov 2025

**🔍 Search Results by Category:**

**HR Policies:**
• Leave Request Procedures
• Performance Review Process
• Compensation & Benefits Overview
• Code of Conduct Guidelines

**IT Documentation:**
• VPN Setup Instructions
• Software Installation Guides
• Security Best Practices
• Troubleshooting Common Issues

**Project Resources:**
• Q4 Initiative Documentation
• Team Collaboration Tools
• Meeting Templates & Guidelines

Would you like me to:
• Summarize any specific document?
• Find additional resources on a particular topic?
• Help you access specific policy information?`,

  "project": `Here are the latest **Q4 Initiative Updates** from our project management system:

**📊 Overall Progress: 75% Complete**

**✅ Completed Milestones:**
• Infrastructure Setup (100%) - Completed Oct 15
• Initial Testing Phase (100%) - Completed Oct 30
• Security Review (100%) - Completed Nov 1
• Stakeholder Approval (100%) - Completed Nov 3

**🔄 In Progress:**
• User Acceptance Testing (60%) - Due Nov 15
• Documentation Updates (45%) - Due Nov 20
• Training Material Development (30%) - Due Nov 25

**📅 Upcoming Milestones:**
• Pre-production Deployment - Nov 30
• Production Rollout - Dec 15
• Post-launch Review - Dec 30

**⚠️ Risks & Issues:**
• Minor delay in training materials (2 days behind)
• Awaiting final approval from legal team
• Resource allocation for UAT phase

**👥 Team Performance:**
• Development Team: On track
• QA Team: Ahead of schedule
• Documentation Team: Slightly behind

Would you like detailed information about any specific milestone or team performance metrics?`,

  "jira": `Here's your **Jira Dashboard Summary**:

**🎯 Your Assigned Tickets:**
• Total Open: 12 tickets
• High Priority: 3 tickets
• In Progress: 5 tickets
• In Review: 2 tickets
• Blocked: 1 ticket

**🔥 High Priority Items:**
1. **PROJ-1234** - Login authentication bug
   • Status: In Progress
   • Assigned: You
   • Due: Nov 5, 2025

2. **PROJ-1235** - Database performance issue
   • Status: Open
   • Assigned: You  
   • Due: Nov 7, 2025

3. **PROJ-1236** - Mobile app crash on startup
   • Status: In Review
   • Assigned: You
   • Due: Nov 10, 2025

**📈 Team Statistics:**
• Tickets Resolved This Week: 18
• Average Resolution Time: 2.3 days
• Team Velocity: 42 story points
• Sprint Progress: 78% complete

**🚀 Available Actions:**
• Create new ticket
• Update ticket status
• Generate team reports
• Export sprint data
• Schedule backlog grooming

What would you like me to help you with regarding your Jira tickets?`,

  "servicenow": `**ServiceNow Integration Portal**

I can help you with various ServiceNow requests:

**🎫 Available Services:**

**1. Incident Management**
• Report system outages
• Hardware/software issues
• Access problems
• Performance issues

**2. Service Requests**
• Software installation requests
• Hardware procurement
• Access provisioning
• Account modifications

**3. Change Management**
• Schedule system changes
• Review change calendars
• Approve/reject changes
• Impact assessments

**📊 Your Current Tickets:**
• **INC-2024-001234** - Laptop keyboard issue (In Progress)
• **REQ-2024-005678** - Adobe Creative Suite access (Approved)
• **CHG-2024-009876** - Server maintenance window (Scheduled)

**⏱️ Service Level Agreements:**
• **Critical Issues**: 4 hours
• **High Priority**: 24 hours  
• **Medium Priority**: 72 hours
• **Low Priority**: 5 business days

**🚀 Quick Actions:**
• Create new incident
• Submit service request
• Check ticket status
• Update existing ticket
• Schedule consultation

Which ServiceNow service would you like to access?`,

  "default": `Thank you for your question! I'm here to help you with various workplace needs:

**🔧 IT Services**
• Create service tickets
• Check system status
• Software support
• Hardware issues

**📋 HR Support** 
• Leave requests
• Benefits information
• Policy questions
• Training enrollment

**📊 Project Management**
• Status updates
• Team information
• Milestone tracking
• Resource allocation

**📚 Documentation**
• Policy searches
• Confluence pages  
• Procedure guides
• Best practices

**🎫 ServiceNow Integration**
• Incident reporting
• Service requests
• Change management
• Ticket tracking

Could you provide more details about what specific assistance you need? I can help with creating tickets, finding documents, checking project status, or managing team information.`
};

// Mock streaming function that simulates the real API
export const mockStreamingResponse = async function* (userInput) {
  const lowerInput = userInput.toLowerCase();
  
  // Determine response based on input keywords
  let response = mockWorkforceResponses.default;
  
  if (lowerInput.includes('training') || lowerInput.includes('cyber') || lowerInput.includes('security')) {
    response = mockWorkforceResponses.training;
  } else if (lowerInput.includes('ticket') || lowerInput.includes('it service') || lowerInput.includes('help')) {
    response = mockWorkforceResponses.ticket;
  } else if (lowerInput.includes('confluence') || lowerInput.includes('document') || lowerInput.includes('policy')) {
    response = mockWorkforceResponses.confluence;
  } else if (lowerInput.includes('project') || lowerInput.includes('milestone') || lowerInput.includes('status')) {
    response = mockWorkforceResponses.project;
  } else if (lowerInput.includes('jira') || lowerInput.includes('bug') || lowerInput.includes('sprint')) {
    response = mockWorkforceResponses.jira;
  } else if (lowerInput.includes('servicenow') || lowerInput.includes('service now') || lowerInput.includes('incident')) {
    response = mockWorkforceResponses.servicenow;
  } else if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('help')) {
    response = mockWorkforceResponses.hello;
  }

  // Check for live agent trigger keywords
  if (lowerInput.includes('live agent') || lowerInput.includes('human') || lowerInput.includes('escalate') || 
      lowerInput.includes('manager') || lowerInput.includes('supervisor') || lowerInput.includes('speak to someone')) {
    yield '<<LiveAgent>>';
    return;
  }

  // Simulate realistic streaming by yielding words with delays
  const words = response.split(' ');
  
  for (let i = 0; i < words.length; i++) {
    // Add space between words except for the first word
    const chunk = i === 0 ? words[i] : ' ' + words[i];
    yield chunk;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
  }
};

// Mock token function for testing
export const mockGetToken = async (domainId) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return a mock token
  return `mock_token_${domainId}_${Date.now()}`;
};