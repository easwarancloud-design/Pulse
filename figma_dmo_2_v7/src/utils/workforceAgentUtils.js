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

  // Remove case-creation command tokens like <00>, <10>, <01>, <11>
  // Also strip any immediate trailing whitespace/newline after the token
  msg = msg.replace(/<(?:00|10|01|11)>\s*(?:\r?\n)?/g, '');
  
  // Remove verbose case tokens like <<warning>1</warning><termination>0</termination>> (any combination)
  // Remove both 0 and 1 variants and any angle closers
  msg = msg.replace(/<<\s*warning\s*>\s*[01]\s*<\s*\/\s*warning\s*>/gi, '');
  msg = msg.replace(/<\s*termination\s*>\s*[01]\s*<\s*\/\s*termination\s*>\s*>?/gi, '');
  
  // Remove block IDs first
  msg = msg.replace(/\nid:.*?\n\n/g, '');
  msg = msg.replace(/id:.*?\n\n/g, '');
  msg = msg.replace(/\s*id:\s*\w+\s*/gi, '');
  
  // Remove all "data:" prefixes
  msg = msg.replace(/data:\s*/gi, '');
  
  // Remove zero-width and BOM characters that can appear invisibly and cause artifacts
  msg = msg.replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Remove common mojibake bullet artifacts (black circle decoded incorrectly)
  msg = msg.replace(/â—/g, '');
  
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
  
  // Drop trailing bullet-only lines (e.g., • or ● on their own lines) that sometimes appear
  msg = msg.replace(/(?:\r?\n)?(?:[•●◦▪▫]\s*)+(?:\r?\n)*$/g, '');
  
  // Trim trailing non-ASCII artifacts occasionally produced by encoding issues (preserve newlines)
  msg = msg.replace(/[^\x00-\x7F]+$/g, '');
  
  return msg.trim();
};

// Parse case flags (warning, termination) from text supporting both legacy (<00>/<10>/<01>/<11>)
// and verbose (<<warning>1</warning><termination>0</termination>>) formats
export const parseCaseFlagsFromText = (text) => {
  if (!text) return { warning: false, termination: false };
  let warning = false;
  let termination = false;

  // Verbose markers
  if (/<<\s*warning\s*>\s*1\s*<\s*\/\s*warning\s*>/i.test(text)) warning = true;
  if (/<\s*termination\s*>\s*1\s*<\s*\/\s*termination\s*>/i.test(text)) termination = true;

  // Legacy compact tokens
  if (/<(10|11)>/i.test(text)) warning = true;
  if (/<(01|11)>/i.test(text)) termination = true;

  return { warning, termination };
};

// Build a plain-text Casecreation Links block for display (anchors are stripped by formatter)
export const buildCaseCreationBlock = (warning, termination) => {
  if (!warning && !termination) return '';

  const Initial_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=28c4c91b1bed049416f5db1dcd4bcbe4";
  const warning_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=c3ebae321bda801466e8ea0dad4bcb8c";
  const termination_url = "https://elevancehealth.service-now.com/esc?id=sc_cat_item&sys_id=615200c11b6c481016f5db1dcd4bcba0";

  const items = [];
  const linkStyle = 'style="color:#1a366f;text-decoration:underline;display:inline-flex;align-items:center;gap:6px;"';
  const iconSVG = '<svg aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-left:2px;vertical-align:middle;">\
    <path d="M14 3h7v7" stroke="#1a366f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>\
    <path d="M10 14L21 3" stroke="#1a366f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>\
    <path d="M21 14v7H3V3h7" stroke="#1a366f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>\
  </svg>';
  if (warning) {
    items.push(`<li><a ${linkStyle} href="${Initial_url}" target="_blank" rel="noopener noreferrer">Initial Warning ${iconSVG}</a></li>`);
    items.push(`<li><a ${linkStyle} href="${warning_url}" target="_blank" rel="noopener noreferrer">Written Warning ${iconSVG}</a></li>`);
  }
  if (termination) {
    items.push(`<li><a ${linkStyle} href="${termination_url}" target="_blank" rel="noopener noreferrer">Request a Termination ${iconSVG}</a></li>`);
  }

  return (
    `\n\n<!--CASE_LINKS_START-->` +
  `<div class=\"casecreation-links\" style=\"margin-top:12px;text-align:left;\">` +
      `<div style=\"margin-bottom:6px;\"><strong>Case creation links</strong></div>` +
      `<ul style=\"margin:4px 0 0 0; padding-left:0; list-style:none;\">` +
        items.join('') +
      `</ul>` +
    `</div>` +
    `<!--CASE_LINKS_END-->`
  );
};