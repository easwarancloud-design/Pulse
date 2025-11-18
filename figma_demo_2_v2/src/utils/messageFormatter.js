/**
 * Message Formatting Utilities
 * Functions for formatting and cleaning message text
 */

import React from 'react';

/**
 * Format text with proper HTML rendering including links and bold text
 * @param {string|React.Node} text - Text to format
 * @returns {React.Node} Formatted text component
 */
export const formatTextWithLinks = (text) => {
  if (text == null) return '';

  // If we've been given a React node (e.g., JSX for live agent card), just return it
  if (typeof text !== 'string') return text;

  let formattedText = text;

  // Safety: strip any live-agent control markers before HTML formatting
  formattedText = formattedText
    .replace(/<<\s*LiveAgent\s*>>/gi, '')
    .replace(/<\s*LiveAgent\s*>/gi, '');

  // If text already has <strong> tags, don't process it again
  if (formattedText.includes('<strong>')) {
    const formattedTexQuote = formattedText.replace(/'/g, "&apos;");
    return (<div dangerouslySetInnerHTML={{ __html: formattedTexQuote }} />);
  }
  
  // Step 1: Remove Reference Links sections FIRST (before processing bold text)
  formattedText = formattedText
    .replace(/\*\*Reference Links?:\*\*[\s\S]*$/gmi, '')  // Remove from "**Reference Links:**" to end
    .replace(/Reference Links?:[\s\S]*$/gmi, '')          // Remove from "Reference Links:" to end  
    .replace(/\*{4,}/g, '')                              // Remove multiple asterisks (****)
    .replace(/<a href[^>]*>.*?<\/a>/gi, '')              // Remove all HTML anchor tags
    .replace(/Time Away/gi, '')
    .replace(/Paid Time Off Policy/gi, '')
    .replace(/Service Contract Act Paid Time Off Policy/gi, '')
    .replace(/Paid Parental Leave Policy/gi, '')
    .replace(/School Related Leaves Policy/gi, '')
    .replace(/Wellness Days Off/gi, '')
    .replace(/My Choice PTO Policy/gi, '')
    .replace(/id:\s*[A-Za-z0-9_-]+/gi, '')              // Remove ID blocks more aggressively
    .replace(/data:\s*/gi, '');                         // Remove all "data:" prefixes (case-insensitive)
    
  // Step 2: Process text formatting (quotes, line breaks)
  formattedText = formattedText
    .replace(/["']+/g, '')                              // Remove all single/double quotes
    .replace(/\\n/g, '<br />')                          // Literal \n to <br>
    .replace(/\n/g, '<br />')                           // Convert actual newlines to <br>
    .replace(/ {3}- /g, '   • ')                        // Indented dashes to bullets
    .replace(/\n{3,}/g, '\n\n')                         // if there are 3 or more consecutive newlines reduce to 2 new lines
    .replace(/<br\s*\/?>\s*<br\s*\/?>\s*<br\s*\/?>/gi, '<br /><br />'); // Reduce triple line breaks to double
    
  // Step 3: Handle list items (preserve ** for bold)
  formattedText = formattedText.replace(/- (\*\*[^*]+\*\*)/g, '• $1');
    
  // Step 4: FINAL - Convert **text** to bold (this must be LAST)
  // Use inline style to guarantee bold rendering regardless of external CSS
  formattedText = formattedText.replace(/\*\*([^*\n]+?)\*\*/g, '<strong style="font-weight:800; font-variation-settings: \'wght\' 800;">$1</strong>');
    
  // Final cleanup: collapse excessive breaks and trim trailing space/breaks
  formattedText = formattedText
    // Reduce 3+ <br> to 2
    .replace(/(?:<br\s*\/?>(?:\s|&nbsp;)*?){3,}/gi, '<br /><br />')
    // Remove trailing <br> and whitespace
    .replace(/(?:<br\s*\/?>(?:\s|&nbsp;)*)+$/i, '')
    // Collapse multiple spaces
    .replace(/\s{3,}/g, ' ');

  const formattedTexQuote = formattedText.replace(/'/g, "&apos;");

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: formattedTexQuote }} 
      className="formatted-text-content"
    />
  );
};

/**
 * Extract reference links from text
 * @param {string} text - Text containing links
 * @returns {Array<{url: string, title: string}>} Array of link objects
 */
export const extractReferenceLinks = (text) => {
  if (!text) return [];
  
  const links = [];
  const linkPattern = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let match;
  
  while ((match = linkPattern.exec(text)) !== null) {
    const [, url, title] = match;
    links.push({ url, title });
  }
  
  return links;
};

/**
 * Render live agent message with proper styling
 * @param {string} text - Message text
 * @param {boolean} isFirst - Is this the first message
 * @param {string} agentName - Agent's name
 * @param {boolean} isDarkMode - Is dark mode enabled
 * @returns {React.Node} Formatted live agent message
 */
export const renderLiveAgentMessage = (text, isFirst, agentName, isDarkMode) => (
  <div style={{
    backgroundColor: "transparent",
    padding: "10px 14px",
    borderLeft: `4px solid ${isDarkMode ? '#44B8F3' : '#1a366f'}`,
    borderRadius: "6px",
    color: isDarkMode ? "#FFFFFF" : "#212121",
    fontFamily: "Elevance Sans, Segoe UI, sans-serif",
    fontSize: "16px",
    lineHeight: "1.5",
    marginBottom: "10px"
  }}>
    {isFirst && agentName && (
      <div style={{
        color: isDarkMode ? "#A0BEEA" : "#1a366f",
        fontWeight: 600,
        fontSize: "15px",
        marginBottom: "6px"
      }}>
        {agentName}
      </div>
    )}
    {text}
  </div>
);

export default {
  formatTextWithLinks,
  extractReferenceLinks,
  renderLiveAgentMessage,
};
