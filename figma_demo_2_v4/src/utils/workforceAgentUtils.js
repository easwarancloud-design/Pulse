// UUID v4 generator for unique IDs
export const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Generate session ID
export const generateSessionId = () => {
  const now = new Date();
  return parseInt(
    `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}` +
    `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`
  );
};

// Clean stream text by removing unwanted formatting but preserving links and bold text
export const cleanStreamText = (msg) => {
  if (!msg) return '';
  
  // Remove LiveAgent marker first (critical for display)
  msg = msg.replace(/<<LiveAgent>>/g, '');
  
  // Remove block IDs first
  msg = msg.replace(/\nid:.*?\n\n/g, '');
  msg = msg.replace(/id:.*?\n\n/g, '');
  msg = msg.replace(/\s*id:\s*\w+\s*/gi, '');
  
  // Remove all "data:" prefixes
  msg = msg.replace(/data:\s*/gi, '');
  
  // Remove Reference Links section completely - more aggressive patterns
  msg = msg.replace(/Reference Links?:\s*/gi, '');
  msg = msg.replace(/Reference Links?\n/gi, '');
  
  // Remove the specific reference link titles completely
  msg = msg.replace(/Time Away\s*/gi, '');
  msg = msg.replace(/Paid Time Off Policy\s*/gi, '');
  msg = msg.replace(/Service Contract Act Paid Time Off Policy\s*/gi, '');
  msg = msg.replace(/Paid Parental Leave Policy\s*/gi, '');
  msg = msg.replace(/School Related Leaves Policy\s*/gi, '');
  msg = msg.replace(/Wellness Days Off\s*/gi, '');
  msg = msg.replace(/My Choice PTO Policy\s*/gi, '');
  
  // Literal \n to actual newline
  msg = msg.replace(/\\n/g, '\n');
  
  // Convert markdown-style list items (preserve ** formatting)
  msg = msg.replace(/- \*\*/g, '• **');
  msg = msg.replace(/   - /g, '   • ');
  
  // Collapse 3+ newlines to 2
  msg = msg.replace(/\n{3,}/g, '\n\n');
  
  // Remove excessive whitespace but preserve structure and PRESERVE ** for bold AND <strong> tags
  msg = msg.replace(/[ \t]+/g, ' ');
  
  return msg.trim();
};