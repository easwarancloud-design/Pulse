import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import MenuSidebar from './MenuSidebar';
import { useAccessToken } from './components/UseToken';
import ButtonRow from './components/ButtonRow';
import { uuidv4, cleanStreamText, parseCaseFlagsFromText, buildCaseCreationBlock } from './utils/workforceAgentUtils';
import { API_ENDPOINTS } from './config/api';
import { hybridChatService } from './services/hybridChatService';
import { conversationStorage } from './services/conversationStorageService';
import { conversationLoader } from './services/conversationLoaderService';
import { conversationCacheService } from './services/conversationCacheService';
import { localConversationManager } from './services/localConversationManager';
import { generateConversationTitle, generateFallbackTitle } from './services/titleGenerationService';
import DebugMessagesPanel from './components/DebugMessagesPanel';

// Use assets from the public folder to avoid CRA import restrictions
const ServiceNowIconImg = `${process.env.PUBLIC_URL}/icons/servicenow.png`;
const WorkdayIconImg = `${process.env.PUBLIC_URL}/icons/workday_icon.png`;
// Use updated Pulse icon for loading banner
const PulseIconSvg = `${process.env.PUBLIC_URL}/icons/pulse_icon_new.png`;
const OutlookIconImg = `${process.env.PUBLIC_URL}/icons/outlook_icon.png`;

// Ensure question text is safe for HTTP headers (browsers block non-ASCII/newlines)
const normalizeHeader = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/[\r\n]+/g, ' ')       // strip CR/LF to avoid header injection/TypeError
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes → '
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes → "
    .replace(/[\u2013\u2014]/g, '-')  // en/em dashes → -
    .replace(/\u2026/g, '...')       // ellipsis → ...
    .replace(/[\u00A0]/g, ' ')       // non-breaking space → space
    .replace(/[^\x20-\x7E]/g, ' '); // replace remaining non-ASCII with space
};

// Text formatting utilities
const formatTextWithLinks = (text) => {
  if (text == null) return '';

  // If we've been given a React node (e.g., JSX for live agent card), just return it
  if (typeof text !== 'string') return text;

  let formattedText = text;

  // Fix corrupted UTF-8 characters that show as boxes (□)
  formattedText = formattedText
    .replace(/â€¢/g, '•')        // Fix bullet points
    .replace(/â—/g, '')         // Remove black-circle mojibake artifacts
    .replace(/â€"/g, '—')        // Fix em dash
    .replace(/â€™/g, "'")        // Fix right single quotation mark
    .replace(/â€œ/g, '"')        // Fix left double quotation mark
    .replace(/â€/g, '"')         // Fix right double quotation mark
    .replace(/âŒ/g, '❌')        // Fix cross mark
    .replace(/âš ï¸/g, '⚠️')     // Fix warning sign
    .replace(/âš™ï¸/g, '⚙️')     // Fix gear
    .replace(/â±ï¸/g, '⏱️')     // Fix stopwatch
    .replace(/ðŸš¨/g, '🚨')       // Fix police car light
    .replace(/ðŸŒ/g, '🌐')        // Fix globe
    .replace(/ðŸ"/g, '🔍')        // Fix magnifying glass
    .replace(/ðŸ"§/g, '🔧')       // Fix wrench
    .replace(/ðŸš«/g, '🚫')       // Fix no entry sign
    .replace(/ðŸ"/g, '🔒')        // Fix lock
    .replace(/□/g, '')           // Remove box characters entirely
    .replace(/\uFFFD/g, '');     // Remove replacement characters

  // Safety: strip any live-agent control markers before HTML formatting
  formattedText = formattedText
    .replace(/<<\s*LiveAgent\s*>>/gi, '')
    .replace(/<\s*LiveAgent\s*>/gi, '');

  // Remove zero-width characters globally to avoid invisible artifacts
  formattedText = formattedText.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // If this message contains legacy/verbose case tokens but no case-links block yet,
  // compute and append the block so refreshed conversations still show case links.
  if (!/CASE_LINKS_START/.test(formattedText) && !/Casecreation Links:/i.test(formattedText)) {
    const { warning, termination } = parseCaseFlagsFromText(formattedText);
    if (warning || termination) {
      // Remove tokens and append the block
      const cleaned = cleanStreamText(formattedText);
      formattedText = (cleaned + buildCaseCreationBlock(warning, termination)).trim();
    }
  }

  // Preserve Casecreation Links block (with anchors) while cleaning the rest
  const CASE_START = '<!--CASE_LINKS_START-->';
  const CASE_END = '<!--CASE_LINKS_END-->';
  let preservedCaseBlock = '';
  let workingText = formattedText;
  const startIdx = workingText.indexOf(CASE_START);
  if (startIdx !== -1) {
    const endIdx = workingText.indexOf(CASE_END, startIdx);
    if (endIdx !== -1) {
      preservedCaseBlock = workingText.slice(startIdx, endIdx + CASE_END.length);
      workingText = workingText.slice(0, startIdx) + '[[[CASE_LINKS_PLACEHOLDER]]]' + workingText.slice(endIdx + CASE_END.length);
    }
  }

  // If text already has <strong> tags, don't process it again
  if (workingText.includes('<strong>') && !workingText.includes('[[[CASE_LINKS_PLACEHOLDER]]]')) {
    const formattedTexQuote = workingText.replace(/'/g, "&apos;");
    return (<div dangerouslySetInnerHTML={{ __html: formattedTexQuote }} />);
  }
  
  // Step 1: Remove Reference Links sections FIRST (before processing bold text)
  workingText = workingText
    .replace(/\*\*Reference Links?:\*\*[\s\S]*$/gmi, '')  // Remove from "**Reference Links:**" to end
    .replace(/Reference Links?:[\s\S]*$/gmi, '')          // Remove from "Reference Links:" to end  
    .replace(/\*{4,}/g, '')                              // Remove multiple asterisks (****)
    .replace(/<a href[^>]*>.*?<\/a>/gi, '')              // Remove all HTML anchor tags (case links preserved separately)
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
  workingText = workingText
    .replace(/["']+/g, '')                              // Remove all single/double quotes
    .replace(/\\n/g, '<br />')                          // Literal \n to <br>
    .replace(/\n/g, '<br />')                           // Convert actual newlines to <br>
    .replace(/ {3}- /g, '   • ')                        // Indented dashes to bullets (fixed UTF-8)
    .replace(/\n{3,}/g, '\n\n')                         // if there are 3 or more consecutive newlines reduce to 2 new lines
    .replace(/<br\s*\/?>\s*<br\s*\/?>\s*<br\s*\/?>/gi, '<br /><br />'); // Reduce triple line breaks to double
    
  // Step 3: Handle list items (preserve ** for bold)
  workingText = workingText.replace(/- (\*\*[^*]+\*\*)/g, '• $1');  // Fixed UTF-8 bullet character
    
  // Step 4: FINAL - Convert **text** to bold (this must be LAST)
  // Use inline style to guarantee bold rendering regardless of external CSS
  workingText = workingText.replace(/\*\*([^*\n]+?)\*\*/g, '<strong style="font-weight:800; font-variation-settings: \"wght\" 800;">$1</strong>');
    
  // Final cleanup: collapse excessive breaks and trim trailing space/breaks
  workingText = workingText
    // Reduce 3+ <br> to 2
    .replace(/(?:<br\s*\/?>(?:\s|&nbsp;)*?){3,}/gi, '<br /><br />')
    // Remove trailing <br> and whitespace
    .replace(/(?:<br\s*\/?>(?:\s|&nbsp;)*)+$/i, '')
    // Collapse multiple spaces
    .replace(/\s{3,}/g, ' ')
    // Remove trailing bullet-only lines after formatting (handles plain bullets left at end)
    .replace(/(?:\n|<br\s*\/?\>)*(?:[•●◦▪▫]\s*)+$/gi, '')
    // Remove trailing non-ASCII mojibake artifacts (rarely appear at the end)
    .replace(/[^\x00-\x7F]+$/g, '');

  // Restore preserved case links block if present
  if (preservedCaseBlock) {
    workingText = workingText.replace('[[[CASE_LINKS_PLACEHOLDER]]]', preservedCaseBlock);
  }

  const formattedTexQuote = workingText.replace(/'/g, "&apos;");

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: formattedTexQuote }} 
      className="formatted-text-content"
    />
  );
};

// Extract reference links from text (tolerates empty anchor text after cleaning)
const extractReferenceLinks = (text) => {
  if (!text) return [];

  const links = [];
  // Capture href and allow empty inner text; use non-greedy for safety
  const linkPattern = /<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
  let match;

  while ((match = linkPattern.exec(text)) !== null) {
    const [, url, rawTitle] = match;
    const title = (rawTitle || '').trim();
    // Fallback label if text was stripped by cleaner
    const fallbackTitle = (() => {
      try {
        const u = new URL(url);
        return u.hostname.replace(/^www\./, '');
      } catch {
        return url;
      }
    })();
    links.push({ url, title: title || fallbackTitle });
  }

  return links;
};

const ChatPage = ({ onBack, userQuestion, onToggleTheme, isDarkMode, currentThread, isNewChat, isNewChatActive, isNewChatDisabled, onNewChat, onThreadSelect, onFirstMessage, onThreadUpdate, userInfo, addConversationImmediateRef, onAutoSendStart, onAutoSendComplete }) => {
  const location = useLocation();
  const { getToken } = useAccessToken();
  
  // Parse URL parameters for embedded navigation
  const urlParams = new URLSearchParams(location.search);
  const urlQuery = urlParams.get('query');
  const urlConversationId = urlParams.get('conversationId');
  const urlType = urlParams.get('type');
  // Breadcrumb params for result page context
  const urlCodeName = urlParams.get('codeName') || urlParams.get('codename') || '';
  const urlResultId = urlParams.get('id') || urlParams.get('conversationId') || '';

  // Use URL parameters if available, otherwise use props
  const effectiveQuestion = urlQuery || userQuestion;
  // DEBUG: Log initial auto-send context once per mount
  try {
    if (!window.__initialAutoSendLogged) {
      window.__initialAutoSendLogged = true;
      console.group('🚦 Auto-send context (ChatPage init)');
      console.log('Raw URL params:', { urlQuery, urlType, urlConversationId });
      console.log('Props/state:', { userQuestion, isNewChat, currentThreadId: currentThread?.id, currentThreadTitle: currentThread?.title, conversationLength: currentThread?.conversation?.length || 0 });
      console.log('Derived:', { effectiveQuestion, effectiveType, apiTriggered });
      console.log('Global guards:', {
        sendInProgress: !!window.__sendInProgress,
        creatingConversationGuard: window.__creatingConversationGuard,
        titleLocked: window.__titleLocked,
        manualQueryConsumed: window.__manualQueryConsumed || false
      });
      console.groupEnd();
    }
  } catch (_) {}
  const effectiveType = urlType;
  
  // Workforce agent state
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [apiTriggered, setApiTriggered] = useState(false); // Flag to prevent infinite loops
  // Ref to suppress duplicate auto-trigger executions (StrictMode / rapid re-renders)
  const autoTriggerExecutedRef = useRef(false);
  // Banner visibility: show until first streaming chunk arrives
  const [hasFirstChunk, setHasFirstChunk] = useState(false);
  
  // Reference links sidebar state
  const [showReferenceLinks, setShowReferenceLinks] = useState(false);
  const [currentReferenceLinks, setCurrentReferenceLinks] = useState([]);
  // Sources panel tabs
  const [activeSourcesTab, setActiveSourcesTab] = useState('sources'); // 'sources' | 'related'
  const [relatedLinks, setRelatedLinks] = useState([]); // reserved for future related links data
  
  // Resolve domainId strictly from Okta-derived userInfo in localStorage; no defaults
  const getResolvedDomainId = () => {
    try {
      const info = JSON.parse(localStorage.getItem('userInfo') || '{}');
      return info.domainId || info.domain_id || null;
    } catch {
      return null;
    }
  };
  const RESOLVED_DOMAIN_ID = getResolvedDomainId();

  const sendWorkforceAgentMessage = async (inputText, replaceExisting = false) => {
    // Global reentrancy guard to prevent double-trigger from overlapping effects/handlers
    if (loading) return; // Prevent duplicate calls based on local state
    if (window.__sendInProgress && (Date.now() - (window.__sendInProgress.startedAt || 0)) < 30000) {
      // A send is already in progress within 30s window; skip re-entry
      return;
    }
    window.__sendInProgress = { startedAt: Date.now() };
    // DEBUG latch: mark manual URL query as consumed so subsequent New Chat doesn't reuse it
    try {
      if (urlType === 'manual' && !window.__manualQueryConsumed) {
        window.__manualQueryConsumed = true;
        console.log('🔒 Manual URL query consumed for auto-send:', { consumedText: inputText });
      }
    } catch (_) {}
    
  setLoading(true);
  setHasFirstChunk(false); // reset banner state at start of every send
    setApiTriggered(true);
    // Mark the time this send started
    lastSendAtRef.current = Date.now();
    
    // ðŸ”„ Reset save flags for new message
    window.userQuestionSaved = false;
    window.assistantResponseSaved = false;
    
    // STEP 1: Show user message IMMEDIATELY
    let partialMessage = '';
    let liveAgentTriggered = false;
    const botChatId = `msg_${Date.now()}`;
    const userChatId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const domainid = RESOLVED_DOMAIN_ID;
    if (!domainid) {
      console.warn('⚠️ domainId missing from Okta user; aborting send');
      setLoading(false);
      setApiTriggered(false);
      return;
    }
    const apiStartTime = performance.now();
    
  hybridChatService.setUserId(domainid);

    let userMessage, botMessage;

    if (replaceExisting && messages.length >= 2) {
      userMessage = { ...messages[0], text: inputText, chat_id: userChatId };
      botMessage = { 
        ...messages[1], 
        text: '', 
        originalText: '',
        completed: false, 
        chat_id: botChatId 
      };
      setMessages([userMessage, botMessage]);
    } else {
      userMessage = { id: messages.length + 1, type: 'user', text: inputText, chat_id: userChatId };
      botMessage = { 
        id: messages.length + 2, 
        type: 'assistant', 
        text: '', 
        originalText: '',
        completed: false, 
        chat_id: botChatId 
      };
      setMessages(prev => [...prev, userMessage, botMessage]);
    }

    // Track which user message initiated the current streaming request so banner shows only once
    setStreamingMessageId(userChatId);
    
    // Pre-compute flags and deferred save helper (visible across the whole function scope)
    const hasExistingMessages = currentThread?.conversation && currentThread.conversation.length > 0;
    const isFirstMessageInNewChat = (isNewChat && !hasExistingMessages);
    // Prepare deferred first user save function (executed after API title persists)
    const doSaveFirstUserQuestion = async () => {
      await hybridChatService.saveUserQuestion(
        inputText, 
        { 
          source: 'chat_page', 
          timestamp: Date.now(),
          domain_id: domainid
        },
        userChatId
      );
      window.userQuestionSaved = true;
      const activeConversationId2 = hybridChatService.getCurrentConversationId();
      if (activeConversationId2) {
        localConversationManager.saveMessageLocally(activeConversationId2, {
          type: 'user',
          text: inputText,
          chat_id: userChatId,
          timestamp: Date.now()
        });
      } else if (currentThread?.id) {
        localConversationManager.saveMessageLocally(currentThread.id, {
          type: 'user',
          text: inputText,
          chat_id: userChatId,
          timestamp: Date.now()
        });
      }
    };

    // Helper: pick an initial title preferring API-generated, with fast timeout, and never 'New Chat'
    const getInitialTitle = async (question) => {
      let fallbackTitle = generateFallbackTitle(question);
      if (!fallbackTitle || fallbackTitle.trim().toLowerCase() === 'new chat') {
        const trimmed = (question || '').trim();
        fallbackTitle = trimmed
          ? (trimmed.length > 50 ? trimmed.substring(0, 50) + '...' : trimmed)
          : 'Conversation';
      }

      // Try API generation but cap with a short timeout so we don't block the UX
      const tryGenerate = async () => {
        try {
          const apiTitle = await generateConversationTitle(question, conversationStorage.defaultUserId);
          if (apiTitle && apiTitle.trim().length > 0 && apiTitle.trim().toLowerCase() !== 'new chat') {
            return apiTitle.trim();
          }
        } catch (_) {}
        return null;
      };

      const withTimeout = (p, ms) => new Promise(resolve => {
        let settled = false;
        const timer = setTimeout(() => { if (!settled) resolve(null); }, ms);
        p.then(v => { if (!settled) { settled = true; clearTimeout(timer); resolve(v); } })
         .catch(() => { if (!settled) { settled = true; clearTimeout(timer); resolve(null); } });
      });

      // Give manual form-submitted questions a little more time to generate a high-quality title
      const timeoutMs = (urlType === 'manual') ? 3000 : 1500;
      const apiTitle = await withTimeout(tryGenerate(), timeoutMs);
      return apiTitle || fallbackTitle;
    };

    // STEP 2: Handle conversation creation
    try {
      // Check if we need to create a new conversation
      const hasActiveConversation = hybridChatService.getCurrentConversationId();
      // Prevent duplicate conversation creation within the same send by using a volatile guard
      if (!window.__creatingConversationGuard) {
        window.__creatingConversationGuard = { startedAt: Date.now(), id: null };
      }
  const creatingGuardActive = window.__creatingConversationGuard && (Date.now() - window.__creatingConversationGuard.startedAt) < 30000; // 30s
  const shouldCreateNewConversation = ((isNewChat && !hasExistingMessages) || !hasActiveConversation) && !window.__creatingConversationGuard.id;
      
  if (shouldCreateNewConversation) {
        
        // 🎯 Choose an initial title (prefer API-generated, fallback fast)
        const initialTitle = await getInitialTitle(inputText);
        // Remember locally for UI until a later API title update
        stableTitleRef.current = initialTitle;
        
        // If we already have a currentThread from "New Chat", use it and create backend conversation
  if (currentThread && currentThread.title === 'New Chat') {
          // DEBUG removed
          
          // Create the conversation in the backend with the temporary title first
          const backendConversationId = await hybridChatService.startNewConversation(initialTitle);
          // Record guard to avoid a second startNewConversation in the same flow
          if (backendConversationId) {
            window.__creatingConversationGuard.id = backendConversationId;
          }
          
          // 🎯 Generate proper title via API in background (non-blocking)
          generateConversationTitle(inputText, conversationStorage.defaultUserId).then(apiTitle => {
            if (apiTitle && apiTitle !== initialTitle) {
              // DEBUG removed
              // Update sidebar
              if (addConversationImmediateRef.current) {
                addConversationImmediateRef.current.updateTitle(backendConversationId, apiTitle);
              }
              // Update localStorage
              localConversationManager.updateConversationTitle(backendConversationId, apiTitle);
              // Update current thread
              if (currentThread) {
                currentThread.title = apiTitle;
                stableTitleRef.current = apiTitle;
                // Lock title to prevent future fallback overwrites
                try {
                  if (!window.__titleLocked) window.__titleLocked = {};
                  window.__titleLocked[backendConversationId] = true;
                } catch {}
                if (onThreadUpdate) {
                  onThreadUpdate({ ...currentThread, title: apiTitle });
                }
              }

              // 🔄 Invalidate caches so sidebar/thread lists pick up the new API title
              try {
                if (conversationCacheService) {
                  const hadConvCache = conversationCacheService.has(backendConversationId);
                  conversationCacheService.remove(backendConversationId);
                  // DEBUG removed

                  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
                  const userId = userInfo.domainId || userInfo.domain_id || null;
                  if (userId) {
                    conversationCacheService.clearUserCache(userId);
                  }
                  // DEBUG removed
                } else {
                  // WARN kept minimal
                }
              } catch (cacheErr) {
                // WARN kept minimal
              }
              
              // 🎯 UPDATE BACKEND with API-generated title
              hybridChatService.updateConversation(
                backendConversationId,
                { 
                  title: apiTitle,
                  metadata: { 
                    api_generated: true,
                    generated_at: new Date().toISOString()
                  }
                }
              ).then(async () => {
                // After persisting API title, save first user question if deferred
                if (isFirstMessageInNewChat && !window.userQuestionSaved) {
                  await doSaveFirstUserQuestion();
                }
              }).catch(err => console.error('❌ Failed to update backend with API title:', err));
            }
          }).catch(err => {
            // If title generation fails, ensure backend does NOT keep "New Chat".
            // Persist fallback title immediately as a best-effort.
            try {
              if (backendConversationId && initialTitle) {
                hybridChatService.updateConversation(
                  backendConversationId,
                  {
                    title: initialTitle,
                    metadata: {
                      api_generated: false,
                      fallback_applied: true,
                      generated_at: new Date().toISOString()
                    }
                  }
                ).catch(() => {});
                // Remember authoritative title locally as well
                stableTitleRef.current = initialTitle;
              }
            } catch (_) {}
            // If title generation fails, still save the first user question
            if (isFirstMessageInNewChat && !window.userQuestionSaved) {
              doSaveFirstUserQuestion().catch(() => {});
            }
          });
          
          // Update the thread ID to match the backend conversation ID
          if (backendConversationId) {
            // DEBUG removed
            const oldId = currentThread.id;
            currentThread.id = backendConversationId;
            hybridChatService.setActiveConversation(backendConversationId);
            
            // 🔄 Migrate localStorage from old temp ID to new backend ID
            const oldLocalData = localConversationManager.getLocalConversation(oldId);
            if (oldLocalData) {
              // DEBUG removed
              // Save under new ID
              localConversationManager.saveCompleteConversation(
                backendConversationId,
                oldLocalData.title,
                oldLocalData.messages
              );
              // Delete old entry
              localConversationManager.deleteLocalConversation(oldId);
              // DEBUG removed
            }
            
            // 🔄 Update sidebar to use new ID
            if (addConversationImmediateRef.current) {
              addConversationImmediateRef.current.updateId(oldId, backendConversationId);
              // DEBUG removed
            }
            
            // 🎯 DON'T add new conversation - just update the existing "New Chat" entry
            // The title will be updated later in the title update block (line ~228)
            // DEBUG removed
          }
          
          // Conversation is now added to sidebar - title update will just update the existing entry
        } else {
          // Only create new conversation if we don't have a "New Chat" thread
          const conversationId = await hybridChatService.startNewConversation(initialTitle);
          if (conversationId) {
            window.__creatingConversationGuard.id = conversationId;
          }
          
          // 🎯 Add to sidebar - only for truly new conversations
          if (addConversationImmediateRef.current && conversationId) {
            addConversationImmediateRef.current.addConversation(conversationId, initialTitle);
          }
          
          // 🎯 Generate proper title via API in background (non-blocking)
          generateConversationTitle(inputText, conversationStorage.defaultUserId).then(apiTitle => {
            if (apiTitle && apiTitle !== initialTitle) {
              // DEBUG removed
              // Update sidebar
              if (addConversationImmediateRef.current) {
                addConversationImmediateRef.current.updateTitle(conversationId, apiTitle);
              }
              // Update localStorage
              localConversationManager.updateConversationTitle(conversationId, apiTitle);
              // Remember authoritative title
              stableTitleRef.current = apiTitle;
              // Lock title to prevent future fallback overwrites
              try {
                if (!window.__titleLocked) window.__titleLocked = {};
                window.__titleLocked[conversationId] = true;
              } catch {}

              // 🔄 Invalidate caches so lists and loader return fresh title
              try {
                if (conversationCacheService) {
                  const hadConvCache = conversationCacheService.has(conversationId);
                  conversationCacheService.remove(conversationId);
                  // DEBUG removed

                  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
                  const userId = userInfo.domainId || userInfo.domain_id || null;
                  if (userId) {
                    conversationCacheService.clearUserCache(userId);
                  }
                  // DEBUG removed
                }
              } catch (cacheErr) {
                // WARN kept minimal
              }
              
              // 🎯 UPDATE BACKEND with API-generated title
              hybridChatService.updateConversation(
                conversationId,
                { 
                  title: apiTitle,
                  metadata: { 
                    api_generated: true,
                    generated_at: new Date().toISOString()
                  }
                }
              ).then(async () => {
                if (isFirstMessageInNewChat && !window.userQuestionSaved) {
                  await doSaveFirstUserQuestion();
                }
              }).catch(err => console.error('❌ Failed to update backend with API title:', err));
            }
          }).catch(err => {
            // If title generation fails, persist fallback/safeTempTitle so backend doesn't stay "New Chat".
            try {
              if (conversationId && initialTitle) {
                hybridChatService.updateConversation(
                  conversationId,
                  {
                    title: initialTitle,
                    metadata: {
                      api_generated: false,
                      fallback_applied: true,
                      generated_at: new Date().toISOString()
                    }
                  }
                ).catch(() => {});
                stableTitleRef.current = initialTitle;
              }
            } catch (_) {}
            if (isFirstMessageInNewChat && !window.userQuestionSaved) {
              doSaveFirstUserQuestion().catch(() => {});
            }
          });
        }
      } else {
        // No new conversation needed; continue with existing
      }
    } catch (error) {
      console.error('âŒ Failed to create conversation:', error);
      // Continue with chat even if conversation creation fails
    }

    // 🎯 Update title if this is the first question in a "New Chat"
    if (currentThread && currentThread.title === 'New Chat' && inputText.trim() && !(window.__titleLocked && window.__titleLocked[currentThread.id])) {
      // 🎯 Use temporary fallback title immediately (non-blocking)
  const tempQuestionTitle = generateFallbackTitle(inputText);
  // Remember we set a temporary title until API title arrives
  stableTitleRef.current = tempQuestionTitle;
      
  // DEBUG removed
      
      // Update sidebar title immediately with temp title
      if (addConversationImmediateRef.current) {
        // Just update the title of the existing sidebar entry, don't add new one
        addConversationImmediateRef.current.updateTitle(currentThread.id, tempQuestionTitle);
  // DEBUG removed
      } else {
  // WARN kept minimal
      }
      
      // Update localStorage with temp title immediately
      localConversationManager.updateConversationTitle(currentThread.id, tempQuestionTitle);
  // DEBUG removed
      
      // Update the current thread title so we don't treat follow-ups as new chats
      currentThread.title = tempQuestionTitle;
      
      // 🔄 Notify App.js about the title change (keeps currentThread in sync)
      if (onThreadUpdate) {
        onThreadUpdate({
          ...currentThread,
          title: tempQuestionTitle
        });
  // DEBUG removed
      }
      
      // 🎯 Generate proper title via API in background (non-blocking)
      generateConversationTitle(inputText, conversationStorage.defaultUserId).then(apiTitle => {
        if (apiTitle && apiTitle !== tempQuestionTitle) {
          // DEBUG removed
          // Update sidebar
          if (addConversationImmediateRef.current) {
            addConversationImmediateRef.current.updateTitle(currentThread.id, apiTitle);
          }
          // Update localStorage
          localConversationManager.updateConversationTitle(currentThread.id, apiTitle);
          // Update current thread
          currentThread.title = apiTitle;
          // Remember authoritative title
          stableTitleRef.current = apiTitle;
          // Lock title to prevent future fallback overwrites
          try {
            if (!window.__titleLocked) window.__titleLocked = {};
            window.__titleLocked[currentThread.id] = true;
          } catch {}
          // Notify App.js
          if (onThreadUpdate) {
            onThreadUpdate({ ...currentThread, title: apiTitle });
          }

          // 🔄 Invalidate caches so any lists/loader reflect the API title immediately
          try {
            if (conversationCacheService) {
              const hadConvCache = conversationCacheService.has(currentThread.id);
              conversationCacheService.remove(currentThread.id);
              // DEBUG removed

              const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
              const userId = userInfo.domainId || userInfo.domain_id || null;
              if (userId) {
                conversationCacheService.clearUserCache(userId);
              }
              // DEBUG removed
            }
          } catch (cacheErr) {
            // WARN kept minimal
          }
          
          // 🎯 UPDATE BACKEND with API-generated title
          const conversationId = hybridChatService.getCurrentConversationId();
          if (conversationId) {
            hybridChatService.updateConversation(
              conversationId,
              { 
                title: apiTitle,
                summary: 'First question asked',
                metadata: { 
                  api_generated: true,
                  auto_renamed: true,
                  original_title: 'New Chat',
                  generated_at: new Date().toISOString()
                }
              }
            ).catch(err => console.error('❌ Failed to update backend with API title:', err));
          }
        }
      }).catch(err => {
  // WARN kept minimal
      });
      
      // 🚫 Do NOT update backend with temporary title.
      // We keep the temp title locally for UI responsiveness and only persist the API-generated title
      // once available to avoid backend showing "New Chat" or provisional titles.
    }
    
    // 💾 Save user question: defer for the first message in a new chat until title is persisted
    if (isFirstMessageInNewChat) {
      // Defer saving; will be executed after API title update or on failure
    } else {
      try {
        await doSaveFirstUserQuestion();
      } catch (storageError) {
        console.error('❌ Failed to save user question:', storageError);
        console.error('❌ Error details:', {
          name: storageError.name,
          message: storageError.message,
          stack: storageError.stack
        });
      }
    }

    try {
      const token = await getToken(domainid);
      // Build chat URL with required query params
      const activeConversationId = hybridChatService.getCurrentConversationId();
      const limit = 10; // default seed size for history
      // Append doc_id from URL if id, codeName/codename, and title are all present
      (() => {})(); // placeholder no-op to preserve formatting
      const currentUrlForDoc = new URL(window.location.href);
      const docIdParam = currentUrlForDoc.searchParams.get('id');
      const codeNameParam = currentUrlForDoc.searchParams.get('codeName') || currentUrlForDoc.searchParams.get('codename');
      const titleParam = currentUrlForDoc.searchParams.get('title');
      let chatUrl = `${API_ENDPOINTS.WORKFORCE_CHAT}?conversation_id=${encodeURIComponent(activeConversationId || '')}&limit=${limit}`;
      if (docIdParam && codeNameParam && titleParam) {
        chatUrl += `&doc_id=${encodeURIComponent(docIdParam)}`;
      }
      const response = await fetch(chatUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          // Use a sanitized ASCII-only header value so the browser doesn't block the request
          question: normalizeHeader(inputText),
          domainid: domainid.toUpperCase(),
        },
      }).catch(fetchError => {
        console.error('ðŸš¨ Fetch failed:', fetchError);
        console.error('ðŸŒ Network error details:', {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack
        });
        throw new Error(`Network request failed: ${fetchError.message}`);
      });

      
      const responseStartTime = performance.now();

      if (!response.ok) {
        console.error('âŒ API Error:', response.status, await response.text());
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Clone the response so we can check content without consuming the stream
      const responseClone = response.clone();
      const responseText = await responseClone.text();
      // If response is short, it might be a simple message OR a control marker like <<LiveAgent>>.
      if (responseText.length < 50) {
        const shortText = (responseText || '').trim();

        // Detect live agent control signal in short responses as well
        if (/<<\s*LiveAgent\s*>>/i.test(shortText) || /<\s*LiveAgent\s*>/i.test(shortText)) {
          setMessages(prev => prev.map(msg => 
            msg.chat_id === botChatId 
              ? {
                  ...msg,
                  type: 'system',
                  isLiveAgentCard: true,
                  text: null,
                  completed: true
                }
              : msg
          ));
          // Disable input when live agent card is shown - user must select a button
          setIsLiveAgentCardShowing(true);
        } else {
          // Regular short text response
          const cleanedShort = cleanStreamText(shortText) || 'Empty response received from API';
          const { warning, termination } = parseCaseFlagsFromText(shortText);
          const alreadyHasBlock = /Casecreation Links:/i.test(cleanedShort) || /CASE_LINKS_START/.test(cleanedShort);
          const finalShortText = alreadyHasBlock
            ? cleanedShort
            : (cleanedShort + buildCaseCreationBlock(warning, termination)).trim();

          setMessages(prev => prev.map(msg =>
            msg.chat_id === botChatId
              ? { 
                  ...msg, 
                  type: 'assistant', 
                  text: finalShortText, 
                  originalText: shortText,  // Store original short text
                  completed: true,
                  lastUpdated: Date.now()
                }
              : msg
          ));
          
          // ðŸ”„ Save short response immediately (SHORT RESPONSE SAVE)
          try {
            await hybridChatService.saveAssistantResponse(
              finalShortText,
              inputText,
              { 
                source: 'workforce_agent_short',
                timestamp: Date.now(),
                chat_id: botChatId,
                response_type: 'short_response',
                content_length: finalShortText.length
              },
              botChatId // Pass bot chat ID for database storage
            );
            
            // 💾 ALSO SAVE TO LOCAL STORAGE (instant UI response)
            const activeConversationId = hybridChatService.getCurrentConversationId();
            if (activeConversationId) {
              localConversationManager.saveMessageLocally(activeConversationId, {
                type: 'assistant',
                text: finalShortText,
                chat_id: botChatId,
                timestamp: Date.now()
              });
              // DEBUG removed
            } else if (currentThread?.id) {
              localConversationManager.saveMessageLocally(currentThread.id, {
                type: 'assistant',
                text: finalShortText,
                chat_id: botChatId,
                timestamp: Date.now()
              });
              // DEBUG removed
            }
            
            window.responseAlreadySaved = true;
            } catch (shortResponseError) {
            console.error('âŒ [SHORT_RESPONSE] Failed to save short response:', shortResponseError);
            // Don't throw - let the UI continue working
          }
        }
        return;
      }

  const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let leftoverIdLine = '';
  let firstChunkReceived = false;
      let chunkCount = 0;
  // Buffer to accumulate raw stream for detecting control markers spanning chunk boundaries
  let streamBuffer = '';
  // Track if we've trimmed a partial live-agent marker start
  let liveAgentPartialDetected = false;

      while (true) {
  const { done, value } = await reader.read();
        if (done) break;

        if (!firstChunkReceived) {
          const firstChunkTime = performance.now();
          firstChunkReceived = true;
          setHasFirstChunk(true); // hide banner once first bytes arrive
        }

        chunkCount++;
        let chunk = decoder.decode(value, { stream: true });
        streamBuffer += chunk; // append to global buffer for cross-chunk detection

        // If chunk contains start of marker but not full marker, mark partial and strip it from processing portion
        if (!liveAgentTriggered && /<<Live(Agent)?>?/i.test(chunk) && !chunk.includes('<<LiveAgent>>')) {
          liveAgentPartialDetected = true;
        }

        // Detect full marker in accumulated buffer (handles split across chunks)
        const markerIndex = streamBuffer.indexOf('<<LiveAgent>>');
        if (markerIndex !== -1) {
          // Process only text BEFORE the marker (if any not yet streamed)
          const beforeMarker = streamBuffer.slice(0, markerIndex);
          if (beforeMarker && beforeMarker.length > 0) {
            // Clean IDs similar to normal chunk cleaning
            const cleanedBeforeMarker = beforeMarker
              .replace(/\nid:.*?\n\n/g, '')
              .replace(/(^|\n)id:.*?\n\n/g, '')
              .replace(/(^|\n)id:[^\n]*\n/g, '');
            const wordsPre = cleanedBeforeMarker.split(/(\s+)/);
            for (const word of wordsPre) {
              if (!word) continue;
              partialMessage += word;
              try {
                setMessages(prev => prev.map(msg =>
                  msg.chat_id === botChatId
                    ? { 
                        ...msg, 
                        text: cleanStreamText(partialMessage),
                        originalText: partialMessage,  // Store original text with links
                        lastUpdated: Date.now()  // Force React re-render
                      }
                    : msg
                ));
              } catch (updateError) {
                console.error('Error updating message state (pre-marker):', updateError);
              }
              await new Promise(resolve => setTimeout(resolve, 5));
            }
          }
          liveAgentTriggered = true;
          break; // Stop reading further
        }

        // Handle leftover ID lines from previous chunks
        if (leftoverIdLine) {
          chunk = leftoverIdLine + chunk;
          leftoverIdLine = '';
        }

        // Check if chunk ends with incomplete id line
        const idLineMatch = chunk.match(/id:[^\n]*$/);
        if (idLineMatch) {
          leftoverIdLine = idLineMatch[0];
          chunk = chunk.replace(/id:[^\n]*$/, '');
        }

        // If we detected partial marker start previously, remove any trailing partial from current processing text
        if (liveAgentPartialDetected && chunk.includes('<<Live') && !chunk.includes('<<LiveAgent>>')) {
          // Cut off from the marker start so it won't render
            chunk = chunk.substring(0, chunk.indexOf('<<Live'));
        }

        // Clean the chunk of ID lines and unwanted formatting
        const cleanedChunk = chunk
          .replace(/\nid:.*?\n\n/g, '')
          .replace(/(^|\n)id:.*?\n\n/g, '')
          .replace(/(^|\n)id:[^\n]*\n/g, '');

        // Split into words for realistic streaming effect
        const words = cleanedChunk.split(/(\s+)/);

        for (const word of words) {
          partialMessage += word;

          try {
            setMessages(prev => prev.map(msg =>
              msg.chat_id === botChatId
                ? { 
                    ...msg, 
                    text: cleanStreamText(partialMessage),
                    originalText: partialMessage,  // Store original text with links
                    lastUpdated: Date.now()  // Force React re-render
                  }
                : msg
            ));
          } catch (updateError) {
            console.error('Error updating message state:', updateError);
          }

          // Faster streaming effect - reduced from 15ms to 5ms
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }

      const completionTime = performance.now();
      // Handle live agent routing
      if (liveAgentTriggered) {
        setMessages(prev => prev.map(msg => 
          msg.chat_id === botChatId 
            ? {
                ...msg,
                type: 'system',
                isLiveAgentCard: true,
                text: null,
                completed: true
              }
            : msg
        ));
        // Disable input when live agent card is shown - user must select a button
        setIsLiveAgentCardShowing(true);
      } else {
        // Mark bot message as completed and append Casecreation Links (frontend-only)
        const cleanedFinal = cleanStreamText(partialMessage);
        const { warning, termination } = parseCaseFlagsFromText(partialMessage);
  const hasExistingCaseBlock = /Casecreation Links:/i.test(cleanedFinal) || /CASE_LINKS_START/.test(cleanedFinal);
        const finalWithCaseBlock = hasExistingCaseBlock
          ? cleanedFinal
          : (cleanedFinal + buildCaseCreationBlock(warning, termination)).trim();

        setMessages(prev => prev.map(msg =>
          msg.chat_id === botChatId
            ? { 
                ...msg, 
                completed: true, 
                text: finalWithCaseBlock,
                originalText: partialMessage,  // Store original text with links/tokens
                lastUpdated: Date.now()
              }
            : msg
        ));

        // ðŸ”„ Save assistant response immediately after completion (PRIMARY SAVE)
        if (partialMessage && partialMessage.trim().length > 0) {
          try {
            
            await hybridChatService.saveAssistantResponse(
              finalWithCaseBlock,
              inputText,
              { 
                source: 'workforce_agent_completion',
                chat_type: 'bot',
                streaming_completed: true,
                timestamp: Date.now(),
                chat_id: botChatId,
                session_id: Date.now().toString(),
                domain_id: domainid
              },
              botChatId
            );
            
            // Save assistant response to localStorage immediately
            const activeConversationId = hybridChatService.getCurrentConversationId();
            if (activeConversationId) {
              localConversationManager.saveMessageLocally(activeConversationId, {
                type: 'assistant',
                text: finalWithCaseBlock,
                chat_id: botChatId,
                timestamp: Date.now(),
                completed: true
              });
              // DEBUG removed
            } else if (currentThread?.id) {
              localConversationManager.saveMessageLocally(currentThread.id, {
                type: 'assistant',
                text: finalWithCaseBlock,
                chat_id: botChatId,
                timestamp: Date.now(),
                completed: true
              });
              // DEBUG removed
            }
            
            // Mark that we've saved the response to avoid duplicate saves
            window.assistantResponseSaved = true;
            
          } catch (responseError) {
            console.error('âŒ [COMPLETION] Failed to save assistant response:', responseError);
          }
        } else {
          }

        // ðŸ”„ Save to hybrid chat service (replaces localStorage save)
        try {
          
          // Only save user question if not already saved (avoid duplicate)
          if (!window.userQuestionSaved) {
            await hybridChatService.saveUserQuestion(
              inputText, 
              { 
                source: 'chat_page', 
                timestamp: Date.now(),
                chat_id: botChatId,
                session_id: Date.now().toString(),
                domain_id: domainid
              }
            );
            window.userQuestionSaved = true; // Prevent duplicate saves
          } else {
            }
          
          // Save assistant response if we have content (BACKUP SAVE - only if primary save failed)
          if (!window.assistantResponseSaved && partialMessage && partialMessage.trim().length > 0) {
            await hybridChatService.saveAssistantResponse(
              finalWithCaseBlock,
              inputText,
              { 
                source: 'workforce_agent_backup',
                chat_type: 'bot',
                streaming_response: true,
                timestamp: Date.now(),
                chat_id: botChatId,
                session_id: Date.now().toString(),
                domain_id: domainid
              },
              botChatId
            );
            window.assistantResponseSaved = true;
          } else if (window.assistantResponseSaved) {
            } else {
            // Try to get the response from the messages array as fallback
            const currentMessages = messages;
            const lastBotMessage = currentMessages.filter(m => m.type === 'bot').pop();
            if (lastBotMessage && lastBotMessage.text && lastBotMessage.text.trim().length > 0) {
              
              try {
                await hybridChatService.saveAssistantResponse(
                  lastBotMessage.text.trim(),
                  inputText,
                  { 
                    source: 'workforce_agent_fallback',
                    chat_type: 'bot',
                    streaming_response: false,
                    timestamp: Date.now(),
                    chat_id: lastBotMessage.chat_id || botChatId,
                    session_id: Date.now().toString(),
                    domain_id: domainid
                  },
                  lastBotMessage.chat_id || botChatId
                );
                window.assistantResponseSaved = true;
              } catch (fallbackError) {
                console.error('âŒ [FALLBACK] Fallback response save also failed:', fallbackError);
              }
            } else {
              }
          }
          
          } catch (storageError) {
          console.error('âŒ Hybrid service save failed:', storageError);
          console.error('âŒ Storage error details:', {
            name: storageError.name,
            message: storageError.message,
            stack: storageError.stack,
            partialMessageLength: partialMessage?.length || 0,
            conversationId: hybridChatService.getCurrentConversationId()
          });
          // API-only mode - no localStorage fallback
        }

        // 💾 Save complete conversation to local storage after completion
        try {
          const conversationId = hybridChatService.getCurrentConversationId();
          if (conversationId && currentThread) {
            // Get the current conversation title (either from thread or create from question)
            const conversationTitle = (stableTitleRef.current && stableTitleRef.current !== 'New Chat')
              ? stableTitleRef.current
              : (currentThread.title !== 'New Chat' 
                  ? currentThread.title 
                  : (inputText.length > 50 ? inputText.substring(0, 50) + '...' : inputText));
            
            // Get updated messages from state including the just-completed message
            setMessages(currentMessages => {
              const messagesToSave = currentMessages.map(msg => ({
                id: msg.id,
                type: msg.type,
                text: msg.text,
                timestamp: Date.now(),
                chat_id: msg.chat_id
              }));

              // Removed debug payload

              localConversationManager.saveCompleteConversation(
                conversationId, 
                conversationTitle, 
                messagesToSave
              );

              // Trigger a storage event to refresh the sidebar
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'pulse_conversations_updated',
                newValue: conversationId,
                url: window.location.href
              }));

              return currentMessages; // Return unchanged messages
            });
          }
        } catch (localSaveError) {
          console.error('❌ Failed to save complete conversation to local storage:', localSaveError);
        }
      }

    } catch (error) {
      const errorTime = performance.now();
      console.error('ðŸ’¥ API Error at:', new Date().toISOString());
      console.error('â±ï¸ Time until error:', (errorTime - apiStartTime).toFixed(2), 'ms');
      console.error('âŒ Error details:', error);
      console.error('âŒ Error name:', error.name);
      console.error('âŒ Error message:', error.message);
      console.error('âŒ Error stack:', error.stack);
      console.error('âŒ Partial message received:', partialMessage ? partialMessage.substring(0, 100) : 'None');
      
      // Determine user-friendly error message based on error type
      let userErrorMessage = 'âš ï¸ Unable to fetch response. Please try again.';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        userErrorMessage = 'ðŸŒ Network connection issue. Please check your internet connection and try again.';
      } else if (error.message.includes('HTTP error! status: 401')) {
        userErrorMessage = 'ðŸ” Authentication failed. Please refresh the page and try again.';
      } else if (error.message.includes('HTTP error! status: 403')) {
        userErrorMessage = 'ðŸš« Access denied. You may not have permission to access this service.';
      } else if (error.message.includes('HTTP error! status: 500')) {
        userErrorMessage = 'âš™ï¸ Server error. The service is temporarily unavailable. Please try again later.';
      } else if (error.message.includes('HTTP error! status: 503')) {
        userErrorMessage = 'ðŸ”§ Service temporarily unavailable. Please try again in a few moments.';
      }
      
      setMessages(prev => prev.map(msg => {
        if (msg.chat_id !== botChatId) return msg;
        const baseCleaned = partialMessage ? cleanStreamText(partialMessage) : '';
        const { warning, termination } = parseCaseFlagsFromText(partialMessage || '');
  const hasExistingCaseBlock = /Casecreation Links:/i.test(baseCleaned) || /CASE_LINKS_START/.test(baseCleaned);
        const withCaseBlock = hasExistingCaseBlock
          ? baseCleaned
          : (baseCleaned + buildCaseCreationBlock(warning, termination)).trim();
        return {
          ...msg,
          completed: true,
          text: partialMessage
            ? `${withCaseBlock}\n\n${userErrorMessage}`
            : userErrorMessage,
          originalText: partialMessage || '',  // Preserve original text even in error case
          lastUpdated: Date.now()
        };
      }));
    } finally {
      setLoading(false);
      setStreamingMessageId(null);
      // Clear any pre-filled input after completion to prevent unintended reuse
      try { setUserInput(''); } catch {}
      // Clear global reentrancy guard
      try { window.__sendInProgress = null; } catch {}
      // Reset creation guard after send completes to allow future new chats
      try {
        if (window.__creatingConversationGuard) {
          window.__creatingConversationGuard = null;
        }
      } catch {}

      // Notify parent that auto-send cycle has completed (re-enables New Chat)
      try { onAutoSendComplete && onAutoSendComplete(); } catch {}
      // Clear only the 'query' param post-send to avoid reuse; keep id, codeName, title for breadcrumbs/context
      try {
        if (window && window.history && typeof window.history.replaceState === 'function') {
          const url = new URL(window.location.href);
          if (url.searchParams.has('query')) {
            url.searchParams.delete('query');
            window.history.replaceState({}, document.title, `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''}`);
          }
        }
      } catch (_) {}
      // Safety: if first user save was deferred and still pending, commit it now
      try {
        if (!window.userQuestionSaved && typeof doSaveFirstUserQuestion === 'function') {
          await doSaveFirstUserQuestion();
        }
      } catch {}
      
      // ðŸ”„ Ensure response is saved even if there were errors during streaming
      try {
        // Check if we have a completed response that wasn't saved
        const currentMessages = messages;
        const assistantMsg = currentMessages.find(msg => 
          msg.chat_id === botChatId && 
          msg.type === 'assistant' && 
          msg.completed &&
          msg.text &&
          msg.text.trim().length > 0
        );
        
        // Only save if we have content and haven't already saved
        if (assistantMsg && assistantMsg.text && !window.responseAlreadySaved) {
          await hybridChatService.saveAssistantResponse(
            assistantMsg.text,
            inputText,
            { 
              source: 'workforce_agent_finally',
              timestamp: Date.now(),
              chat_id: assistantMsg.chat_id || botChatId,
              fallback_save: true
            },
            assistantMsg.chat_id || botChatId
          );
          
          window.responseAlreadySaved = true;
          } else {
          }
        
        // Reset the save tracking flags for next message
        window.userQuestionSaved = false;
        window.responseAlreadySaved = false;

        // 💾 Save complete conversation to local storage (also in finally block for error cases)
        try {
          const conversationId = hybridChatService.getCurrentConversationId();
          if (conversationId && currentThread) {
            // Get the current conversation title (either from thread or create from question)
            const conversationTitle = currentThread.title !== 'New Chat' 
              ? currentThread.title 
              : (inputText.length > 50 ? inputText.substring(0, 50) + '...' : inputText);
            
            // Get updated messages from state including error messages
            setMessages(currentMessages => {
              const messagesToSave = currentMessages.map(msg => ({
                id: msg.id,
                type: msg.type,
                text: msg.text,
                timestamp: Date.now(),
                chat_id: msg.chat_id
              }));

              // Removed debug payload

              localConversationManager.saveCompleteConversation(
                conversationId, 
                conversationTitle, 
                messagesToSave
              );

              // Trigger a storage event to refresh the sidebar
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'pulse_conversations_updated',
                newValue: conversationId,
                url: window.location.href
              }));

              return currentMessages; // Return unchanged messages
            });

            // Final safety: keep UI title in sync with authoritative title
            try {
              const authoritativeTitle = stableTitleRef.current;
              if (authoritativeTitle && currentThread && currentThread.title !== authoritativeTitle) {
                // DEBUG removed
                currentThread.title = authoritativeTitle;
                if (onThreadUpdate) {
                  onThreadUpdate({ ...currentThread, title: authoritativeTitle });
                }
                localConversationManager.updateConversationTitle(conversationId, authoritativeTitle);
              }
            } catch (syncErr) {
              // WARN kept minimal
            }
          }
        } catch (localSaveError) {
          console.error('❌ Failed to save complete conversation in finally block:', localSaveError);
        }
        
      } catch (finalSaveError) {
        console.error('âŒ Finally block save failed:', finalSaveError);
      }
    }
  };

  const [userInput, setUserInput] = useState(() => {
    // Do NOT pre-fill when navigating to an existing conversation via conversationId
    if (urlConversationId) {
      return '';
    }
    // Pre-fill input only for true new chats with predefined question
    if ((isNewChat && effectiveQuestion && (currentThread?.title === 'New Chat' || effectiveType === 'predefined')) || 
        ((urlQuery && urlType === 'predefined') && !urlConversationId)) {
      return effectiveQuestion;
    }
    return '';
  });
  
  const [messages, setMessages] = useState(() => {
    // Priority 0: Load existing conversation from current thread (with multiple messages) — MUST come first
    if (currentThread?.conversation && currentThread.conversation.length > 1) {
      return currentThread.conversation.map((msg, index) => ({
        id: index + 1,
        type: msg.type,
        text: msg.text,
        showTable: msg.showTable || false,
        isWelcome: msg.isWelcome || false
      }));
    }
    
    // Priority 1: Handle URL parameters from embedded navigation (only if no existing conversation)
    if (urlQuery && urlType === 'manual' && !currentThread?.conversation?.length) {
      return [
        {
          id: 1,
          type: 'user',
          text: urlQuery
        },
        {
          id: 2,
          type: 'assistant',
          text: '', // Empty initially, will be filled by useEffect -> sendWorkforceAgentMessage
          completed: false,
          showTable: false
        }
      ];
    }
    
    // Priority 2: Manual input from main page - show question and prepare for API call
    if (currentThread?.conversation?.length === 1 && currentThread.conversation[0].type === 'user') {
      return [
        {
          id: 1,
          type: 'user',
          text: currentThread.conversation[0].text
        },
        {
          id: 2,
          type: 'assistant',
          text: '', // Empty initially, will be filled by useEffect -> sendWorkforceAgentMessage
          completed: false,
          showTable: false
        }
      ];
    }
    
    // Priority 3: Coming from main page with a manual question (legacy support)
    else if (
      // Legacy manual question path should NOT run when a URL conversationId is present
      effectiveQuestion && !isNewChat && !currentThread?.conversation?.length && !urlType && !urlConversationId
    ) {
      return [
        {
          id: 1,
          type: 'user',
          text: effectiveQuestion
        },
        {
          id: 2,
          type: 'assistant',
          text: '', // Empty initially, will be filled by useEffect -> sendWorkforceAgentMessage
          completed: false,
          showTable: false
        }
      ];
    } 
    
    // Priority 4: New chat or predefined questions - show welcome message or prepare for input
    else if (isNewChat || (urlQuery && urlType === 'predefined' && !currentThread?.conversation?.length)) {
      return [
        {
          id: 1,
          type: 'assistant',
          text: 'Hello! I\'m here to help you with any questions you might have.',
          isWelcome: true
        }
      ];
    } 
    
    // Priority 5: Default fallback - show welcome message
    else {
      return [
        {
          id: 1,
          type: 'assistant',
          text: 'Hello! How can I assist you today?',
          isWelcome: true
        }
      ];
    }
  });

  // Ensure messages reset when starting a brand new chat (sidebar shows New Chat but old messages linger)
  useEffect(() => {
    if (isNewChat && currentThread?.title === 'New Chat' && currentThread?.conversation?.length === 0) {
      // Only reset if we currently still show previous conversation (more than 1 message or first not welcome)
      const showingOld = messages.length > 1 && !messages[0]?.isWelcome;
      if (showingOld) {
        console.log('🧼 Resetting messages for fresh New Chat thread');
        setMessages([
          {
            id: 1,
            type: 'assistant',
            text: 'Hello! I\'m here to help you with any questions you might have.',
            isWelcome: true
          }
        ]);
        // Clear streaming/banner state so UI behaves like a fresh session
        setStreamingMessageId(null);
        setHasFirstChunk(false);
        setApiTriggered(false);
      }
    }
  }, [isNewChat, currentThread?.id]);

  // Loading banner component shown inline after the user message until first streaming chunk
  const LoadingBanner = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '4px 2px',
        // Match assistant response text color/style
        color: isDarkMode ? '#A0BEEA' : '#787777',
        fontFamily: 'Elevance Sans, Segoe UI, sans-serif',
        lineHeight: 1.6,
        textAlign: 'left'
      }}
    >
      <div style={{
        fontSize: '14px',
        fontWeight: 700,
        letterSpacing: '0.2px',
        // Ensure bold renders consistently across browsers
        fontVariationSettings: '"wght" 700'
      }}>Give me a moment</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '14px', fontWeight: 400 }}>Fetching data from</span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <img src={ServiceNowIconImg} alt="Service Now" style={{ height: 18, width: 18, objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ fontSize: '14px', fontWeight: 400 }}>Service Now</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <img src={WorkdayIconImg} alt="Workday" style={{ height: 18, width: 18, objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ fontSize: '14px', fontWeight: 400 }}>Workday</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <img src={PulseIconSvg} alt="Pulse" style={{ height: 20, width: 20, objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ fontSize: '14px', fontWeight: 400 }}>Pulse</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <img src={OutlookIconImg} alt="Outlook" style={{ height: 18, width: 18, objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ fontSize: '14px', fontWeight: 400 }}>Outlook</span>
        </div>
      </div>
    </div>
  );
  
  // Feedback state management with localStorage persistence
  const getFeedbackStorageKey = (type) => `feedback_${type}_${urlConversationId || 'default'}`;
  
  const loadFeedbackFromStorage = (type) => {
    try {
      const stored = localStorage.getItem(getFeedbackStorageKey(type));
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      console.error(`Failed to load ${type} feedback from storage:`, error);
      return new Set();
    }
  };
  
  const saveFeedbackToStorage = (type, feedbackSet) => {
    try {
      localStorage.setItem(getFeedbackStorageKey(type), JSON.stringify([...feedbackSet]));
    } catch (error) {
      console.error(`Failed to save ${type} feedback to storage:`, error);
    }
  };
  
  const [likedMessages, setLikedMessages] = useState(() => loadFeedbackFromStorage('liked'));
  const [dislikedMessages, setDislikedMessages] = useState(() => loadFeedbackFromStorage('disliked'));
  const [copiedMessage, setCopiedMessage] = useState(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const messagesEndRef = useRef(null);

  // Live Agent session state
  const [liveAgent, setLiveAgent] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLiveAgentCardShowing, setIsLiveAgentCardShowing] = useState(false); // Track when live agent card requires button selection
  const buttonRowRef = useRef(null); // Ref to control ButtonRow component imperatively
  const requestIdRef = useRef(null);
  const socketRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  // Track which conversation ID last populated the UI to avoid clobbering in-progress messages
  const lastLoadedThreadIdRef = useRef(null);
  // Track the most authoritative title we've applied (temp fallback or API-generated)
  const stableTitleRef = useRef(null);
  // Track when a send started to avoid clobbering live UI on immediate thread-id switch to empty backend convo
  const lastSendAtRef = useRef(0);
  const INACTIVITY_LIMIT = 19 * 60 * 1000; // 19 minutes

  const resetInactivityTimer = (domainid) => {
    if (!liveAgent || chatEnded) return;
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      terminateLiveAgent("Live agent chat ended due to inactivity.", domainid);
    }, INACTIVITY_LIMIT);
  };

  const renderLiveAgentMessage = (text, isFirst, agentName) => (
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

  const terminateLiveAgent = async (reason = "Disconnected from live agent.", domainidParam) => {
    try {
      const domainid = domainidParam || RESOLVED_DOMAIN_ID;
      setLiveAgent(false);
      setChatEnded(true);
      if (socketRef.current) {
        try { socketRef.current.close(); } catch {}
        socketRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }

      // Notify backend END_CONVERSATION
      const payload = {
        requestId: requestIdRef.current,
        token: "vaacubed",
        botToBot: true,
        clientSessionId: "",
        silentMessage: false,
        message: { text: reason, typed: true },
        userId: domainid,
        emailId: "user@email.com",
        timestamp: Date.now(),
        timezone: "America/New_York",
        action: "END_CONVERSATION"
      };

      try {
        await fetch(API_ENDPOINTS.USER_TO_AGENT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (postErr) {
        console.error('âŒ Failed to notify backend:', postErr);
      }

      // UI message
      setMessages(prev => ([...prev, {
        id: prev.length + 1,
        type: 'system',
        text: `${reason} You can continue chatting with the bot.`
      }]));
    } catch (e) {
      console.error('Error terminating live agent session:', e);
    }
  };

  const handleLiveAgentConnect = (info) => {
    if (!info) return;

    if (info.type === 'continue') {
      // Add system message below the card (card stays visible with highlighted button)
      setMessages(prev => [...prev, { 
        id: prev.length + 1, 
        type: 'system', 
        text: `${info.message} You can continue chatting with the bot.`
      }]);
      // Re-enable input only (buttons stay disabled, card stays visible)
      setIsLiveAgentCardShowing(false);
      return;
    }

    if (info.type === 'connecting') {
      setMessages(prev => [...prev, { id: prev.length + 1, type: 'system', text: info.message }]);
      // Re-enable input (buttons stay disabled, card stays visible)
      setIsLiveAgentCardShowing(false);
      return;
    }

    if (info.type === 'transferred' && info.requestId) {
      setMessages(prev => [...prev, { id: prev.length + 1, type: 'system', text: info.message }]);
      connectWebSocket(info.requestId, RESOLVED_DOMAIN_ID);
      return;
    }

    if (info.type === 'error') {
      setMessages(prev => [...prev, { id: prev.length + 1, type: 'system', text: info.message }]);
      // Re-enable input on error (buttons stay disabled, card stays visible)
      setIsLiveAgentCardShowing(false);
    }
  };

  const connectWebSocket = (requestId, domainid) => {
    try {
      const ws = new WebSocket(`wss://workforceagent.elevancehealth.com/ws/${requestId}`);
      socketRef.current = ws;
      requestIdRef.current = requestId;
      setLiveAgent(true);
      setChatEnded(false);

      const isFirstMessage = () => !messages.some(m => m.type === 'live_agent');

      ws.onopen = () => {
        resetInactivityTimer(domainid);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          // Try both payload shapes from samples
          const directText = typeof msg?.text === 'string' ? msg.text : '';
          const lower = directText.toLowerCase();
          const fromBody = Array.isArray(msg?.body)
            ? (msg.body.find(b => b.uiType === 'OutputText' && b.value)?.value || '')
            : '';
          const completed = msg?.completed === true;
          const agentName = msg?.agentName;
          const text = directText || fromBody || '';
          
          resetInactivityTimer(domainid);

          // System conditions
          if (completed) {
            postSystemAndTerminate('Live agent session ended.', domainid);
            return;
          }

          const lowerText = text.toLowerCase();
          if (lowerText.includes('no agents available')) {
            postSystemAndTerminate('No agents available. Ending session.', domainid);
            return;
          }
          if (lowerText.includes('please try again later')) {
            postSystemAndTerminate(text, domainid);
            return;
          }
          if (lower.includes('your chat with the live agent has ended')) {
            postSystemAndTerminate('Disconnected from the live agent.', domainid);
            return;
          }

          // Normal agent message
          setMessages(prev => ([...prev, {
            id: prev.length + 1,
            type: 'live_agent',
            text: renderLiveAgentMessage(text, isFirstMessage(), agentName)
          }]));
        } catch (err) {
          console.error('ðŸš¨ Failed to parse WebSocket message:', err);
          postSystemAndTerminate('Apologiesâ€”your live agent session was disconnected due to a technical issue. Kindly try again later.', domainid);
        }
      };

      ws.onerror = (e) => {
        console.error('âŒ WebSocket error', e);
        postSystemAndTerminate('A technical issue occurred. Please try reconnecting.', domainid);
      };

      ws.onclose = () => {
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
        socketRef.current = null;
      };
    } catch (e) {
      console.error('Error opening WebSocket:', e);
      postSystemAndTerminate('A technical issue occurred. Please try reconnecting.', domainid);
    }
  };

  const postSystemAndTerminate = (message, domainid) => {
    setMessages(prev => ([...prev, {
      id: prev.length + 1,
      type: 'system',
      text: message
    }]));
    terminateLiveAgent(message, domainid);
  };

  const confirmEndChat = () => {
    setShowConfirm(true);
  };

  const cancelEndChat = () => {
    setShowConfirm(false);
  };

  const endChat = async () => {
    setShowConfirm(false);
    await terminateLiveAgent("You have ended the conversation.", RESOLVED_DOMAIN_ID);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Cleanup timers and websocket on unmount or thread change
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Close live agent session when switching threads
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setLiveAgent(false);
      setChatEnded(true);
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, [currentThread?.id]);

  // Ensure domain ID is properly set in localStorage
  useEffect(() => {
    // Always sync localStorage domainid to resolved domain (Okta preferred)
    const existing = localStorage.getItem('domainid');
    if (existing !== RESOLVED_DOMAIN_ID) {
      localStorage.setItem('domainid', RESOLVED_DOMAIN_ID);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update messages when thread changes
  useEffect(() => {
    // Removed debug summary
    // Guard: Don't overwrite UI while we're actively streaming or when UI already has newer messages
    const currentId = currentThread?.id || null;
    const isThreadSwitch = lastLoadedThreadIdRef.current !== currentId;
    const backendLen = currentThread?.conversation?.length || 0;
    const uiLen = Array.isArray(messages) ? messages.length : 0;
    const justSent = Date.now() - (lastSendAtRef.current || 0) < 15000; // 15s grace window
    if (isThreadSwitch && uiLen > 0 && backendLen === 0 && justSent) {
    // Skip reset due to recent send
      return;
    }
    // NEW GUARD (duplication fix): If we have an empty backend conversation (length 0) BUT the UI already
    // contains a synthesized user + assistant placeholder pair (assistant incomplete), do NOT inject any
    // welcome/fallback messages. This prevents double user/question and double assistant greeting when
    // manual queries navigate from the main/embedded page.
    if (
      backendLen === 0 &&
      uiLen >= 2 &&
      messages[0]?.type === 'user' &&
      messages[1]?.type === 'assistant' &&
      messages[1]?.completed === false
    ) {
      lastLoadedThreadIdRef.current = currentId; // mark as loaded to avoid repeated checks
      return; // Skip further mutation; existing placeholder will be replaced by streaming response
    }
    // If switching to a new thread with no messages yet (loading), clear UI instead of showing previous conversation
    if (isThreadSwitch && backendLen === 0) {
      setMessages([]);
      lastLoadedThreadIdRef.current = currentId;
      // Do not return; allow later effects to populate when conversation arrives
    }
    if (!isThreadSwitch) {
      if (loading || uiLen >= backendLen) {
  // Removed debug detail
        return;
      }
    }
    
    if (currentThread?.conversation && currentThread.conversation.length > 0) {
      // Load conversation history from the selected thread
  // Removed debug mapping

      const threadMessages = currentThread.conversation.map((msg, index) => {
        // Prefer backend UUID id if present; NEVER overwrite with index if it exists
        const backendId = msg.id || msg.message_id || null;
        const chatId = msg.chat_id || null;
        // Normalise type/text from possible backend field names
        const messageType = msg.type || msg.message_type || (msg.role === 'assistant' ? 'assistant' : 'user');
        const messageText = msg.text || msg.content || '';
        return {
          id: backendId || `local_${index + 1}`, // Keep UUID or mark clearly as local fallback
          backend_id: backendId,                 // Preserve original backend id separately
          type: messageType,
          text: messageText,
          showTable: msg.showTable || false,
          isWelcome: msg.isWelcome || false,
          chat_id: chatId,
          original_chat_id: chatId, // alias for clarity in debugging
          isError: msg.isError || false,
          errorType: msg.errorType || null,
          _original: msg // retain original object for future debugging if needed
        };
      });

  // Removed debug mapping
      
      setMessages(threadMessages);
      // Remember that we've loaded this thread into the UI
      lastLoadedThreadIdRef.current = currentId;
    // Removed debug marker
      // Clear the input when switching to an existing thread
      setUserInput('');
    } else if (isNewChat && currentThread && (!currentThread.conversation || currentThread.conversation.length === 0)) {
      // Show welcome message for new chats without conversation
    // Removed debug marker
      const welcomeMessages = [
        {
          id: 1,
          type: 'assistant',
          text: 'Welcome! You can start by typing your message below.',
          isWelcome: true
        }
      ];
      // Only set welcome messages on true thread switch or when UI is empty
      if (isThreadSwitch || uiLen === 0) {
        setMessages(welcomeMessages);
        lastLoadedThreadIdRef.current = currentId;
      } else {
    // Removed debug marker
      }
    } else if (!isNewChat && currentThread && (!currentThread.conversation || currentThread.conversation.length === 0)) {
      // Show fallback message for existing chats that failed to load (404 errors, etc.)
    // Removed debug marker
      const fallbackMessages = [
        {
          id: 1,
          type: 'assistant',
          text: `Unable to load the conversation "${currentThread.title || currentThread.id}". This may happen if the conversation was deleted or is temporarily unavailable. You can start a new conversation by typing your message below.`,
          isWelcome: true,
          isError: true
        }
      ];
      if (isThreadSwitch || uiLen === 0) {
        setMessages(fallbackMessages);
        lastLoadedThreadIdRef.current = currentId;
      } else {
  // DEBUG removed
      }
    } else if (currentThread && !currentThread.conversation) {
      // Safety fallback for any other edge cases
  // DEBUG removed
      const safetyMessages = [
        {
          id: 1,
          type: 'assistant',
          text: 'Welcome! You can start by typing your message below.',
          isWelcome: true
        }
      ];
      if (isThreadSwitch || uiLen === 0) {
        setMessages(safetyMessages);
        lastLoadedThreadIdRef.current = currentId;
      } else {
  // DEBUG removed
      }
    }
    // Note: Don't override messages for single-message conversations (manual input) 
    // because useState already handled the response generation
  }, [currentThread, isNewChat]);

  // Clear input when switching to existing threads
  useEffect(() => {
    if (currentThread?.conversation && currentThread.conversation.length > 0) {
      setUserInput('');
    }
    // Reset API trigger flag when switching threads
    setApiTriggered(false);
  }, [currentThread?.id]);

  // Handle conversation saving for new chats and follow-ups
  useEffect(() => {
    const handleConversationSaving = async () => {
      // Only process if we have messages and they include both user and assistant messages
      if (!messages || messages.length < 2) return;
      
      // Skip if we're still loading (response not complete)
      if (loading) return;

      // Guard: when starting a brand-new chat, ignore only the initial welcome message state.
      // Do NOT block the first real user+assistant exchange from being saved for new/predefined chats.
      if (isNewChat && currentThread && (!currentThread.conversation || currentThread.conversation.length === 0)) {
        const hasOnlyWelcome = messages.length === 1 && messages[0]?.type === 'assistant' && messages[0]?.isWelcome;
        if (hasOnlyWelcome) return;
      }
      
      // Find the latest assistant message to check if response is complete
      const latestAssistant = messages.filter(msg => msg.type === 'assistant').pop();
      if (!latestAssistant || !latestAssistant.completed) return;
      
      try {
  // Case 1: New chat - first message (should save with proper title)
  // 🆕 FIX: Also handle predefined questions that start new conversations
        const isFirstMessage = (!currentThread.conversation || currentThread.conversation.length === 0);
        const shouldSaveAsNew = (isNewChat || urlType === 'predefined') && currentThread && isFirstMessage;
        
        if (shouldSaveAsNew) {
          const userMessage = messages.find(msg => msg.type === 'user');
          if (userMessage) {
            // Preserve authoritative title if already set (API-generated or temp fallback)
            const resolvedTitle = (stableTitleRef.current && stableTitleRef.current !== 'New Chat')
              ? stableTitleRef.current
              : ((currentThread?.title && currentThread.title !== 'New Chat')
                  ? currentThread.title
                  : (userMessage.text.length > 50 ? userMessage.text.substring(0, 50) + '...' : userMessage.text));

            const updatedThread = {
              ...currentThread,
              title: resolvedTitle,
              conversation: messages
            };

            await saveThreadToStorage(updatedThread);
            onFirstMessage && onFirstMessage(updatedThread);
            // DEBUG removed

            // Note: Don't call setIsNewChat here since isNewChat is a prop
            // The parent App.js will update this state via onFirstMessage
          }
        }
        // Case 2: Follow-up message in existing conversation
        else if (currentThread && !isNewChat && 
                 currentThread.conversation && 
                 messages.length > currentThread.conversation.length) {
          
          const updatedThread = {
            ...currentThread,
            conversation: messages
          };
          
          await saveThreadToStorage(updatedThread);
          
          // 🔥 CRITICAL: Invalidate cache so next load gets fresh data with new messages
          // DEBUG removed
          
          if (conversationCacheService) {
            // Clear the specific conversation from cache
            const hadCache = conversationCacheService.has(currentThread.id);
            conversationCacheService.remove(currentThread.id);
            // DEBUG removed
            
            // Also clear user cache to force sidebar refresh
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const userId = userInfo.domainId || userInfo.domain_id || null;
            if (userId) {
              conversationCacheService.clearUserCache(userId);
            }
            // DEBUG removed
            
            // Force refresh the conversation in the loader service
            if (conversationLoader && conversationLoader.refreshConversation) {
              // DEBUG removed
              conversationLoader.refreshConversation(currentThread.id).catch(err => {
                // WARN kept minimal
              });
            }
          } else {
            // WARN kept minimal
          }
          
          onThreadUpdate && onThreadUpdate(updatedThread);
          // DEBUG removed
        }
      } catch (error) {
        console.error('❌ Failed to save conversation:', error);
      }
    };
    
    // Add a small delay to ensure all state updates are complete
    const timeoutId = setTimeout(handleConversationSaving, 300);
    
    return () => clearTimeout(timeoutId);
  }, [messages, loading, isNewChat, currentThread, urlType]);

  // Load conversation from URL if conversationId is provided
  useEffect(() => {
    const loadConversationFromUrl = async () => {
      // Only proceed if we have a URL conversation ID and haven't already loaded it
      if (!urlConversationId || apiTriggered) {
        return;
      }

      try {
        setLoading(true);
        
        // Set user ID for loader service
        conversationLoader.setUserId(RESOLVED_DOMAIN_ID);
        
        // Load conversation with caching
        const conversation = await conversationLoader.loadConversation(urlConversationId, {
          forceRefresh: false,  // Use cache if available
          messageOffset: 0,     // Start from beginning
          messageLimit: 50,     // Initial batch
          includeMessages: true
        });

        if (conversation && conversation.messages) {
          // Set active conversation in hybrid service
          hybridChatService.setActiveConversation(urlConversationId);
          
          // Convert API messages to UI format and extract feedback data
          const likedSet = new Set();
          const dislikedSet = new Set();
          
          const uiMessages = conversation.messages.map((msg, index) => {
            // Extract feedback data for state management
            if (msg.liked === 1) {
              likedSet.add(index + 1); // Use UI message ID
            } else if (msg.liked === -1) {
              dislikedSet.add(index + 1); // Use UI message ID
            }
            
            return {
              id: index + 1,
              type: msg.message_type === 'user' ? 'user' : 'assistant',
              text: msg.content,
              chat_id: msg.id || `msg_${index}`,
              completed: true,
              timestamp: msg.created_at,
              // Add reference links if available
              referenceLinks: msg.reference_links || [],
              // Preserve original message metadata
              metadata: msg.metadata || {},
              // Include feedback data for potential future use
              liked: msg.liked || 0,
              feedback_text: msg.feedback_text || null,
              feedback_at: msg.feedback_at || null
            };
          });

          // Update feedback state from API data
          setLikedMessages(likedSet);
          setDislikedMessages(dislikedSet);
          
          // Also save to localStorage for persistence
          saveFeedbackToStorage('liked', likedSet);
          saveFeedbackToStorage('disliked', dislikedSet);
          
          // Removed debug payload

          setMessages(uiMessages);
          setApiTriggered(true);

          // Check if there are more messages to load
          const hasMore = conversation.pagination?.hasMore || 
                         (conversation.messages.length === 50);
          setHasMoreMessages(hasMore);

          // Clear URL parameters to prevent refresh issues
          window.history.replaceState({}, document.title, window.location.pathname);

          // Extract and set reference links from the last assistant message
          const lastAssistantMessage = uiMessages
            .filter(msg => msg.type === 'assistant')
            .pop();
          
          if (lastAssistantMessage?.referenceLinks?.length > 0) {
            setCurrentReferenceLinks(lastAssistantMessage.referenceLinks);
          }

        } else {
          // Could show an error message or redirect
        }

      } catch (error) {
        console.error(`âŒ Failed to load conversation from URL:`, error);
        // Could show an error message to user
        setMessages([{
          id: 1,
          type: 'system',
          text: 'Sorry, I couldn\'t load that conversation. Please try again or start a new chat.',
          completed: true
        }]);
      } finally {
        setLoading(false);
      }
    };

    loadConversationFromUrl();
  }, [urlConversationId, apiTriggered, RESOLVED_DOMAIN_ID]);

  // Pagination state for long conversations
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);

  // Function to load more messages for pagination
  const loadMoreMessages = async () => {
    if (loadingMoreMessages || !hasMoreMessages || !hybridChatService.getCurrentConversationId()) {
      return;
    }

    try {
      setLoadingMoreMessages(true);
      const currentMessageCount = messages.length;
      
      const moreData = await conversationLoader.loadConversation(
        hybridChatService.getCurrentConversationId(),
        {
          forceRefresh: false,
          messageOffset: currentMessageCount,
          messageLimit: 50,
          includeMessages: true
        }
      );

      if (moreData?.messages?.length > 0) {
        // Convert and append new messages, extracting feedback data
        const newLikedSet = new Set(likedMessages);
        const newDislikedSet = new Set(dislikedMessages);
        
        const newUiMessages = moreData.messages.map((msg, index) => {
          const messageId = currentMessageCount + index + 1;
          
          // Extract feedback data for state management
          if (msg.liked === 1) {
            newLikedSet.add(messageId);
          } else if (msg.liked === -1) {
            newDislikedSet.add(messageId);
          }
          
          return {
            id: messageId,
            type: msg.message_type === 'user' ? 'user' : 'assistant',
            text: msg.content,
            chat_id: msg.id || `msg_${currentMessageCount + index}`,
            completed: true,
            timestamp: msg.created_at,
            referenceLinks: msg.reference_links || [],
            metadata: msg.metadata || {},
            // Include feedback data
            liked: msg.liked || 0,
            feedback_text: msg.feedback_text || null,
            feedback_at: msg.feedback_at || null
          };
        });
        
        // Update feedback state with new data
        setLikedMessages(newLikedSet);
        setDislikedMessages(newDislikedSet);
        
        // Save updated feedback to localStorage
        saveFeedbackToStorage('liked', newLikedSet);
        saveFeedbackToStorage('disliked', newDislikedSet);

        setMessages(prev => [...prev, ...newUiMessages]);
        
        // Update hasMore based on returned message count
        const hasMore = moreData.pagination?.hasMore || 
                       (moreData.messages.length === 50);
        setHasMoreMessages(hasMore);

        } else {
        setHasMoreMessages(false);
        }

    } catch (error) {
      console.error('âŒ Failed to load more messages:', error);
      // Don't show error to user, just stop trying to load more
      setHasMoreMessages(false);
    } finally {
      setLoadingMoreMessages(false);
    }
  };

  // Auto-trigger live API for questions from main page or embedded page
  useEffect(() => {
    // CRITICAL: Clear URL params immediately on mount to prevent re-use when switching threads
    const shouldClearUrl = (urlQuery || urlType) && !apiTriggered;
    // DEBUG: Evaluate auto-trigger conditions
    try {
      console.groupCollapsed('🧪 Auto-trigger evaluation');
      console.log('Inputs:', { urlQuery, urlType, urlConversationId, effectiveQuestion, isNewChat, apiTriggered, conversationLength: currentThread?.conversation?.length || 0 });
      console.log('Guards:', { manualQueryConsumed: window.__manualQueryConsumed || false, sendInProgress: !!window.__sendInProgress });
      console.groupEnd();
    } catch (_) {}

    const manualConsumed = !!window.__manualQueryConsumed;
    const shouldCallLiveAPI = !manualConsumed && !autoTriggerExecutedRef.current && (
      // Manual question from main page (Legacy support - Priority 3)
      (effectiveQuestion && !isNewChat && !currentThread?.conversation?.length && !urlType) ||
      // Manual question from URL parameters (embedded page) — only if no conversation has been loaded yet
      (urlQuery && urlType === 'manual' && !currentThread?.conversation?.length)
      // 🚫 REMOVED: Predefined questions should NOT auto-trigger
      // They should just pre-fill the input and wait for user to press Enter
    ) && !urlConversationId; // Never auto-trigger when a specific conversationId is provided

    if (shouldCallLiveAPI && effectiveQuestion && !apiTriggered) {
      console.log('🚀 Auto-send triggered', { question: effectiveQuestion, source: urlQuery ? 'urlQuery' : 'state', urlType, isNewChat });
      // Replace the default response with live API call
      const questionText = urlQuery || effectiveQuestion;
      // Notify parent that auto-send is starting (disables New Chat)
      try { onAutoSendStart && onAutoSendStart(); } catch {}
      setApiTriggered(true); // Set flag to prevent re-execution
      autoTriggerExecutedRef.current = true; // Mark executed to block further duplicate triggers
      
      // Remove only 'query' param immediately after processing to prevent duplicate auto-send; keep id/codeName/title
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('query')) {
          url.searchParams.delete('query');
          window.history.replaceState({}, document.title, `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''}`);
        }
      } catch (_) {}
      
      sendWorkforceAgentMessage(questionText, true); // true = replace existing
    } else if (shouldClearUrl && !shouldCallLiveAPI) {
      console.log('🧹 Removing only query param without auto-send (conditions not met)', { shouldClearUrl, shouldCallLiveAPI });
      // Remove only 'query' param even if we're not auto-triggering (avoid future reuse); keep id/codeName/title
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('query')) {
          url.searchParams.delete('query');
          window.history.replaceState({}, document.title, `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''}`);
        }
      } catch (_) {}
    }
  }, [effectiveQuestion, urlQuery, urlType, urlConversationId, isNewChat, currentThread?.id, apiTriggered]);

  // When a brand new chat thread is created (isNewChat true) ensure we do NOT reuse consumed manual query
  useEffect(() => {
    if (isNewChat && window.__manualQueryConsumed) {
      // Defensive: reset autoTriggerExecutedRef so manual input typed AFTER new chat can still trigger once
      autoTriggerExecutedRef.current = false;
      console.log('🛑 New chat started; manual URL query previously consumed. Suppressing reuse.');
    }
  }, [isNewChat, currentThread?.id]);

  // Handle predefined questions - just clear URL params without auto-triggering
  useEffect(() => {
    if (urlQuery && urlType === 'predefined') {
  // DEBUG removed
      // Remove only the 'query' param to prevent refresh issues, but don't auto-trigger
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('query')) {
          url.searchParams.delete('query');
          window.history.replaceState({}, document.title, `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''}`);
        }
      } catch (_) {}
      // The question will be pre-filled in userInput via the useState initializer above
    }
  }, [urlQuery, urlType]);

  // Load feedback states when conversation changes
  useEffect(() => {
    const conversationId = hybridChatService.getCurrentConversationId();
    if (conversationId) {
      const likedSet = loadFeedbackFromStorage('liked');
      const dislikedSet = loadFeedbackFromStorage('disliked');
      setLikedMessages(likedSet);
  setDislikedMessages(dislikedSet);
  // Removed debug payload
    }
  }, [hybridChatService.getCurrentConversationId()]);

  const saveThreadToStorage = async (thread) => {
    try {
      // ðŸ”„ Use conversation API only (no localStorage)
      if (hybridChatService.getCurrentConversationId()) {
        // Update existing conversation title
        const updateResult = await hybridChatService.updateConversation(
          hybridChatService.getCurrentConversationId(),
          { 
            title: thread.title,
            summary: thread.conversation?.length > 0 ? 
              `${thread.conversation.length} messages` : 'New conversation',
            metadata: { 
              updated_from: 'thread_save',
              thread_data: thread,
              last_updated: new Date().toISOString()
            }
          }
        );
        
        // Handle both successful updates and fallback responses
        if (updateResult && updateResult.success === false) {
          } else {
          }
      } else {
        // Create new conversation if none exists
        const newConversation = await hybridChatService.startNewConversation(thread.title);
        }
    } catch (error) {
      console.error('âŒ Failed to save thread via API:', error);
      
      // Don't throw the error - just log it and continue
      // This prevents the entire chat from breaking due to update failures
      // Note: No localStorage fallback - API-only mode but graceful degradation
    }
  };

  const handleSendMessage = async () => {
    if (userInput.trim() && !loading && !showConfirm) {
      // Capture the question then clear input immediately so it disappears while streaming starts
      const questionToSend = userInput.trim();
      setUserInput(''); // clear before triggering API
      
      // Use workforce agent for real responses
      await sendWorkforceAgentMessage(questionToSend);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !showConfirm) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLike = async (message) => {
    // Use preserved backend_id if available (UUID); fall back to displayed id
    const messageId = message.backend_id || message.id;
    const isCurrentlyLiked = likedMessages.has(messageId);
    const newLikedValue = isCurrentlyLiked ? 0 : 1; // Toggle between neutral (0) and like (1)
    
    // Removed debug payload
    
    // Update UI state immediately and persist to localStorage
    const newLikedSet = new Set(likedMessages);
    const newDislikedSet = new Set(dislikedMessages);
    
    if (isCurrentlyLiked) {
      newLikedSet.delete(messageId);
    } else {
      newLikedSet.add(messageId);
      // Remove dislike if exists (mutual exclusion)
      newDislikedSet.delete(messageId);
    }
    
    // Update states
    setLikedMessages(newLikedSet);
    if (!isCurrentlyLiked) {
      setDislikedMessages(newDislikedSet);
    }
    
    // Persist to localStorage immediately
    saveFeedbackToStorage('liked', newLikedSet);
    if (!isCurrentlyLiked) {
      saveFeedbackToStorage('disliked', newDislikedSet);
    }

    // Store feedback in backend (best effort, don't revert UI on failure)
    try {
      const conversationId = hybridChatService.getCurrentConversationId();
  const chatId = message.chat_id || message.original_chat_id || null;
      
  // Removed debug payload
      
      if (conversationStorage && conversationId) {
        // Always use improved feedback method with fallback logic
        // It will try message_id first, then automatically try chat_id approach if that fails
    // Removed debug marker
        const result = await conversationStorage.updateMessageFeedbackImproved(
          conversationId,
          messageId,
          { liked: newLikedValue },
          chatId
        );
    // Removed debug marker
      } else {
    // Skipped backend feedback due to missing storage/id
      }
    } catch (error) {
      console.error('❌ Failed to store like feedback:', error);
      console.error('âŒ Failed to store like feedback:', error);
      // Optionally revert UI state on error
      setLikedMessages(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyLiked) {
          newSet.add(messageId);
        } else {
          newSet.delete(messageId);
        }
        return newSet;
      });
    }
  };

  const handleDislike = async (message) => {
    const messageId = message.backend_id || message.id;
    const isCurrentlyDisliked = dislikedMessages.has(messageId);
    const newLikedValue = isCurrentlyDisliked ? 0 : -1; // Toggle between neutral (0) and dislike (-1)
    
    // Removed debug payload
    
    // Update UI state immediately and persist to localStorage
    const newDislikedSet = new Set(dislikedMessages);
    const newLikedSet = new Set(likedMessages);
    
    if (isCurrentlyDisliked) {
      newDislikedSet.delete(messageId);
    } else {
      newDislikedSet.add(messageId);
      // Remove like if exists (mutual exclusion)
      newLikedSet.delete(messageId);
    }
    
    // Update states
    setDislikedMessages(newDislikedSet);
    if (!isCurrentlyDisliked) {
      setLikedMessages(newLikedSet);
    }
    
    // Persist to localStorage immediately
    saveFeedbackToStorage('disliked', newDislikedSet);
    if (!isCurrentlyDisliked) {
      saveFeedbackToStorage('liked', newLikedSet);
    }

    // Store feedback in backend (best effort, don't revert UI on failure)
    try {
      const conversationId = hybridChatService.getCurrentConversationId();
  const chatId = message.chat_id || message.original_chat_id || null;
      
  // Removed debug payload
      
      if (conversationStorage && conversationId) {
        // Always use improved feedback method with fallback logic
        // It will try message_id first, then automatically try chat_id approach if that fails
    // Removed debug marker
        const result = await conversationStorage.updateMessageFeedbackImproved(
          conversationId,
          messageId,
          { liked: newLikedValue },
          chatId
        );
    // Removed debug marker
      } else {
    // Skipped backend feedback due to missing storage/id
      }
    } catch (error) {
      console.error('❌ Failed to store dislike feedback:', error);
      console.error('âŒ Failed to store dislike feedback:', error);
      // Optionally revert UI state on error
      setDislikedMessages(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyDisliked) {
          newSet.add(messageId);
        } else {
          newSet.delete(messageId);
        }
        return newSet;
      });
    }
  };

  const handleCopy = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessage(messageId);
      setTimeout(() => setCopiedMessage(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Handle reload/regenerate response
  const handleReload = async (messageId) => {
    try {
      // Find the message to reload
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) return;
      
      const messageToReload = messages[messageIndex];
      // Determine canonical feedback key (backend_id preferred)
      const feedbackKey = messageToReload.backend_id || messageToReload.id;
      // Clear any existing like/dislike feedback locally when regeneration starts
      setLikedMessages(prev => {
        const next = new Set(prev);
        if (next.delete(feedbackKey)) {
          saveFeedbackToStorage('liked', next);
        }
        return next;
      });
      setDislikedMessages(prev => {
        const next = new Set(prev);
        if (next.delete(feedbackKey)) {
          saveFeedbackToStorage('disliked', next);
        }
        return next;
      });
      // Attempt to reset backend feedback to neutral (liked:0) best-effort
      try {
        const conversationId = hybridChatService.getCurrentConversationId();
        const chatId = messageToReload.chat_id || messageToReload.original_chat_id || null;
        if (conversationStorage && conversationId) {
          await conversationStorage.updateMessageFeedbackImproved(
            conversationId,
            feedbackKey,
            { liked: 0 },
            chatId
          );
        }
      } catch (resetErr) {
        console.error('Feedback neutralization on regenerate failed (non-fatal):', resetErr);
      }
      
      // Find the preceding user message
      let userQuestion = '';
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].type === 'user') {
          userQuestion = messages[i].text;
          break;
        }
      }
      
      if (!userQuestion) {
        return;
      }
      
      // Set as currently streaming message
      setStreamingMessageId(messageId);
      
      // Set loading state for this message
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: '', isRegenerating: true, completed: false }
          : msg
      ));
      
      // Get fresh token for reload
  const domainId = (getResolvedDomainId() || '').toUpperCase();
      if (!domainId) {
        throw new Error('Missing domainId for token fetch');
      }
      
      let token;
      try {
  token = await getToken(domainId, true); // Force real API using resolved domain
      } catch (tokenError) {
        console.error('âŒ Token fetch failed:', tokenError);
        throw new Error(`Failed to get authentication token: ${tokenError.message}`);
      }
      
      if (!token) {
        throw new Error('Failed to get authentication token - token is null');
      }
      
      let response;
      try {
        // Always call the real workforce agent API for reload
        // Build chat URL with required query params for regenerate
        const activeConversationId = hybridChatService.getCurrentConversationId();
        const regenLimit = 10;
        // Append doc_id from URL if id, codeName/codename, and title are all present
        const regenUrlBase = `${API_ENDPOINTS.WORKFORCE_CHAT}?conversation_id=${encodeURIComponent(activeConversationId || '')}&limit=${regenLimit}`;
        const currentUrlForDoc2 = new URL(window.location.href);
        const docIdParam2 = currentUrlForDoc2.searchParams.get('id');
        const codeNameParam2 = currentUrlForDoc2.searchParams.get('codeName') || currentUrlForDoc2.searchParams.get('codename');
        const titleParam2 = currentUrlForDoc2.searchParams.get('title');
        const regenUrl = (docIdParam2 && codeNameParam2 && titleParam2)
          ? `${regenUrlBase}&doc_id=${encodeURIComponent(docIdParam2)}`
          : regenUrlBase;
        response = await fetch(regenUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            // Normalize header to strip problematic Unicode / control chars (regeneration previously failed here)
            question: normalizeHeader(userQuestion),
            domainid: domainId.toUpperCase(),
          },
        });
      } catch (fetchError) {
        console.error('âŒ Fetch failed:', fetchError);
        throw new Error(`Network request failed: ${fetchError.message}`);
      }
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Check for live agent trigger
        if (chunk.includes("<<LiveAgent>>")) {
          setMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, text: "ðŸ”„ Connecting you to a live agent. Please wait...", isRegenerating: false, completed: true }
                : msg
          ));
          break;
        }
        
        fullResponse += chunk;
        
        // Update message with streaming content (apply text cleaning)
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, text: cleanStreamText(fullResponse), isRegenerating: true, completed: false }
              : msg
        ));
      }
      
      // Mark as complete and stop streaming (apply final text cleaning) and append case links
      {
        const cleaned = cleanStreamText(fullResponse);
        const { warning, termination } = parseCaseFlagsFromText(fullResponse);
  const hasExistingCaseBlock = /Casecreation Links:/i.test(cleaned) || /CASE_LINKS_START/.test(cleaned);
        const finalText = hasExistingCaseBlock ? cleaned : (cleaned + buildCaseCreationBlock(warning, termination)).trim();
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, text: finalText, isRegenerating: false, completed: true }
            : msg
        ));
      }
      
      setStreamingMessageId(null);
      
      // Update regenerated response in backend using existing add_message endpoint
      // The backend will detect existing chat_id and UPDATE instead of INSERT
      if (fullResponse && fullResponse.trim().length > 0) {
        try {
          // DEBUG removed
          
          const messageToUpdate = messages.find(msg => msg.id === messageId);
          const chatId = messageToUpdate?.chat_id || messageId;
          
          // Call the existing add_message endpoint - backend will detect chat_id exists and UPDATE
          // Compute final text with case links for persistence
          const cleanedForSave = cleanStreamText(fullResponse).trim();
          const { warning, termination } = parseCaseFlagsFromText(fullResponse);
          const hasBlock = /Casecreation Links:/i.test(cleanedForSave) || /CASE_LINKS_START/.test(cleanedForSave);
          const finalForSave = hasBlock ? cleanedForSave : (cleanedForSave + buildCaseCreationBlock(warning, termination)).trim();

          await conversationStorage.addMessage(
            currentThread?.id || 'unknown',
            'assistant',
            finalForSave,
            {
              source: 'workforce_agent_regenerated',
              chat_type: 'bot',
              regenerated: true,
              timestamp: Date.now(),
              session_id: Date.now().toString(),
              domain_id: domainId
            },
            [],
            chatId  // This tells backend to update message with this chat_id if exists
          );
          
          // DEBUG removed
          
        } catch (saveError) {
          console.error('❌ Failed to save regenerated response:', saveError);
          // Don't throw - let the UI continue working even if save fails
        }
      }
      
    } catch (error) {
      console.error('âŒ Failed to reload response:', error);
      
      // Show error message and stop streaming
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              text: `Failed to regenerate response: ${error.message}. Please try again.`,
              isRegenerating: false,
              completed: true 
            }
          : msg
      ));
      
      setStreamingMessageId(null);
    }
  };

  // Toggle reference links sidebar; if already open, close on second click
  const handleReferenceLinks = (messageText, messageId) => {
    const links = extractReferenceLinks(messageText);
    if (!links.length) return;
    if (showReferenceLinks) {
      setShowReferenceLinks(false);
      return;
    }
    setCurrentReferenceLinks(links);
    setActiveSourcesTab('sources');
    setShowReferenceLinks(true);
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-[#072056] to-[#000B23]' : 'bg-[#F9FAFB]'}`}>
      {/* Background effects for dark mode (temporarily removed to resolve JSX parse issue) */}

      {/* Breadcrumb moved back inside right pane as sticky header to preserve scroll behavior */}
      {/* Main horizontal layout below breadcrumb */}
      <div className="flex flex-1 w-full overflow-hidden">
        {/* Left Sidebar Column with background-only breadcrumb (no text) */}
        <div className="flex flex-col h-full overflow-hidden">
          {/* Left sidebar breadcrumb with text, matching chat window style */}
          {(() => {
            const params = new URLSearchParams(location.search);
            const hasAllParams = params.get('id') && (params.get('codeName') || params.get('code_name')) && params.get('title');
            const constantTitle = 'Enterprise News with Video';
            return hasAllParams ? (
              <div style={{
                position: 'sticky',
                top: '0px',
                zIndex: 30,
                // Match chat window breadcrumb background exactly
                background: isDarkMode ? 'rgba(18, 47, 101, 0.25)' : '#EAF5FF'
              }}>
                <div className="px-5 pt-3 pb-3">
                  <div className={`flex items-center`} style={{ gap: '10px' }}>
                    {/* Make left sidebar breadcrumb text color match background so it's not visible, as requested */}
                    <span className="text-sm font-semibold" style={{ color: isDarkMode ? 'rgba(18, 47, 101, 0.25)' : '#EAF5FF' }}>
                      {constantTitle}
                    </span>
                  </div>
                </div>
              </div>
            ) : null;
          })()}

          <MenuSidebar 
            onBack={onBack} 
            onToggleTheme={onToggleTheme}
            isDarkMode={isDarkMode}
            onNewChat={onNewChat}
            onThreadSelect={onThreadSelect}
            currentActiveThread={currentThread}
            isNewChatActive={isNewChatActive}
            onAddConversationImmediate={addConversationImmediateRef}
            onThreadUpdate={onThreadUpdate}
            isNewChatDisabled={Boolean(isNewChatDisabled) || Boolean(apiTriggered && (urlType === 'manual' || (!urlType && userQuestion)) && loading)}
          />
        </div>

        {/* Right Chat Window */}
  <div className={`flex-1 flex flex-col h-full overflow-hidden relative z-10 ${isDarkMode ? 'bg-gradient-to-br from-[#072056] to-[#000B23]' : ''}`}>
        {/* Sticky breadcrumb header inside chat pane - use title from URL, no borders, with subtle background */}
        {(() => {
          const params = new URLSearchParams(location.search);
          const urlTitle = params.get('title');
          const hasAllParams = params.get('id') && (params.get('codeName') || params.get('code_name')) && urlTitle;
          return hasAllParams ? (
            <div className="sticky top-0 z-10" style={{
              background: isDarkMode ? 'rgba(18, 47, 101, 0.25)' : '#EAF5FF'
            }}>
              <div className="px-5 pt-3 pb-3">
                <div className={`flex items-center ${isDarkMode ? 'text-[#A0BEEA]' : 'text-[#1a366f]'}`} style={{ gap: '10px' }}>
                  <span className="text-sm font-semibold">{decodeURIComponent(urlTitle)}</span>
                  <span aria-hidden="true" className={`${isDarkMode ? 'text-[#A0BEEA]' : 'text-[#44B8F3]'}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </span>
                  <span className="inline-flex items-center gap-6">
                    <span className={`inline-flex items-center justify-center ${isDarkMode ? 'text-[#A0BEEA]' : 'text-[#44B8F3]'}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2l10 10-10 10L2 12 12 2z" fill="currentColor" opacity="0.6" />
                      </svg>
                    </span>
                    <span className="text-sm font-semibold">AI Search</span>
                  </span>
                </div>
              </div>
            </div>
          ) : null;
        })()}

        {/* Chat Messages Area - Scrollable */}
        <div className={`flex-1 overflow-y-auto p-5`}>
          <div 
            className="mx-auto"
            style={{
              display: 'flex',
              width: '760px',
              paddingTop: '24px',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '32px',
              alignSelf: 'stretch'
            }}
          >
            {/* (Removed top banner; now rendered inline after user message) */}
            {/* Load More Messages Button (appears at top when there are more messages) */}
            {hasMoreMessages && (
              <div className="w-full flex justify-center mb-4">
                <button
                  onClick={loadMoreMessages}
                  disabled={loadingMoreMessages}
                  className={`
                    px-6 py-3 rounded-full border-2 transition-all duration-200
                    ${isDarkMode 
                      ? 'bg-[#1F3E81] border-[#2861BB] text-white hover:bg-[#2A4A8C]' 
                      : 'bg-white border-[#2861BB] text-[#2861BB] hover:bg-[#F0F8FF]'
                    }
                    ${loadingMoreMessages ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                  `}
                >
                  {loadingMoreMessages ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m18 15-6-6-6 6"/>
                      </svg>
                      Load More Messages
                    </div>
                  )}
                </button>
              </div>
            )}

            {messages.map((message) => {
              return (
              <div key={message.id} style={{ width: '100%' }}>
                {message.type === 'user' ? (
                  <>
                    <div className="flex justify-end">
                      <div className={`${isDarkMode ? 'bg-[#1F3E81]' : 'bg-[#E3F4FD]'} rounded-[32px_0_32px_32px] px-6 py-3 max-w-[467px]`}>
                        <p className={`${isDarkMode ? 'text-white' : 'text-[#231E33]'} text-sm leading-[21px] text-left`}>{message.text}</p>
                      </div>
                    </div>
                    {/* Inline loading banner appears immediately after the user question, before assistant stream starts */}
                    {loading && !hasFirstChunk && streamingMessageId === message.chat_id && (
                      <div style={{ marginTop: '6px', marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
                        {/* Extra spacing between the question and loading indicator for visual clarity */}
                        <div style={{ height: '16px' }} />
                        <LoadingBanner />
                      </div>
                    )}
                  </>
                ) : message.isWelcome ? (
                  <div className="space-y-4">
                    <div className={`${isDarkMode ? 'text-[#A0BEEA]' : 'text-[#787777]'} text-sm leading-relaxed`}>
                      {message.text}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {message.suggestions?.map((suggestion, index) => (
                        <button 
                          key={index} 
                          onClick={() => {
                            setUserInput(`Tell me about ${suggestion.toLowerCase()}`);
                          }}
                          className={`${isDarkMode ? 'bg-[#1F3E81] text-[#A0BEEA] hover:bg-[#2A4A8C]' : 'bg-[#F7F7F7] text-[#333333] hover:bg-[#E7E7E7]'} rounded p-3 text-sm text-left transition-colors cursor-pointer`}
                        >
                          â€¢ {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : message.type === 'system' ? (
                  // System messages - check if already JSX styled or plain text
                  <div className="space-y-4">
                    {message.isLiveAgentCard ? (
                      <div style={{
                        backgroundColor: isDarkMode ? "#122F65" : "#f9fbfc",
                        padding: "20px",
                        borderRadius: "12px",
                        marginBottom: "16px",
                        fontFamily: "Segoe UI, Elevance Sans, sans-serif",
                        color: isDarkMode ? "#A0BEEA" : "#1a366f",
                        boxShadow: isDarkMode ? "0 1px 3px rgba(0, 0, 0, 0.2)" : "0 1px 3px rgba(0, 0, 0, 0.04)",
                        maxWidth: "640px",
                        marginLeft: "auto",
                        marginRight: "auto",
                        lineHeight: "1.5"
                      }}>
                        <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "18px", textAlign: "left", letterSpacing: "0.2px" }}>
                          <span style={{ display: 'block', marginBottom: '12px' }}>
                            If you have a question related to manager coaching or corrective actions and wish to connect with a live agent, please click on <strong>"Manager coaching and coaching for corrective action"</strong>.
                          </span>
                          <span style={{ display: 'block', marginBottom: '12px' }}>
                            If you have questions related to all other HR areas and wish to connect with a live agent, please click <strong>"Other HR support"</strong>.
                          </span>
                          <span style={{ display: 'block' }}>
                            If you would like to view the HR Service Catalog, please click on <strong>"ServiceNow ticket catalog"</strong>.
                          </span>
                        </p>
                        <ButtonRow
                          ref={buttonRowRef}
                          domainid={RESOLVED_DOMAIN_ID}
                          isDarkMode={isDarkMode}
                          onAgentConnect={handleLiveAgentConnect}
                        />
                      </div>
                    ) : typeof message.text === 'string' ? (
                      // Plain text system messages get styled
                      <div className={`p-3 rounded-lg ${
                        isDarkMode 
                          ? 'bg-transparent text-white' 
                          : 'bg-[#f8f9fa] text-[#2c3e50]'
                      } text-center font-medium`}>
                        {message.text}
                      </div>
                    ) : (
                      // Other JSX system messages render as-is
                      message.text
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="space-y-4">
                      <div className={`${isDarkMode ? 'text-[#A0BEEA]' : 'text-[#787777]'} text-sm leading-relaxed text-left`} style={{ lineHeight: '1.6', textAlign: 'left' }}>
                        {formatTextWithLinks(message.text)}
                        {/* Show typing indicator for streaming messages */}
                        {!message.completed && (message.chat_id === streamingMessageId || message.id === streamingMessageId) && (
                          <span className="inline-flex ml-1">
                            <span className="animate-pulse">â—</span>
                            <span className="animate-pulse animation-delay-200">â—</span>
                            <span className="animate-pulse animation-delay-400">â—</span>
                          </span>
                        )}
                        {/* Show regenerating indicator */}
                        {message.isRegenerating && (
                          <div className={`mt-2 ml-1 flex flex-col gap-1`}> 
                            <div className={`inline-flex items-center gap-2 text-xs font-semibold ${isDarkMode ? 'text-[#44B8F3]' : 'text-[#2861BB]'}`}>
                              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span>Regenerating...</span>
                            </div>
                            {/* Lightweight skeleton while new content streams in */}
                            <div className="flex flex-col gap-1 mt-1">
                              <div className={`h-2 rounded ${isDarkMode ? 'bg-[#1F3E81]' : 'bg-[#EAF5FF]'} animate-pulse w-40`}></div>
                              <div className={`h-2 rounded ${isDarkMode ? 'bg-[#1F3E81]' : 'bg-[#EAF5FF]'} animate-pulse w-32`}></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Show table for first response or when showTable is true */}
                      {message.showTable && (
                        <div className={`${isDarkMode ? 'bg-transparent border-[#2861BB]' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden shadow-sm`}>
                          <table className="w-full text-sm">
                            <thead className={isDarkMode ? 'bg-transparent' : 'bg-gray-50'}>
                              <tr>
                                <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Name</th>
                                <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Employee ID</th>
                                <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Email</th>
                                <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Status</th>
                              </tr>
                            </thead>
                            <tbody className={`${isDarkMode ? 'divide-[#2861BB]' : 'divide-gray-200'} divide-y`}>
                              <tr>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Deepl, Priya</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Priya.Deepl@elevancehealth.com</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                    Not Started
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Garcia, Sophia</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Sophia.Garcia@elevancehealth.com</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                    Not Started
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Johnson, Alex</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Alex.Johnson@elevancehealth.com</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                    Not Started
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Lin, Marco</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Marco.Lin@elevancehealth.com</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                    Not Started
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Miller, Ethan</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>AGT23456</td>
                                <td className={`px-4 py-3 ${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'}`}>Ethan.Miller@elevancehealth.com</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                                    Not Started
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Show only after assistant message is complete (or non-streamed legacy), never while streaming */}
                    {message.type === 'assistant' &&
                     !message.isWelcome &&
                     message.type !== 'system' &&
                     // Must be completed if it was streamed
                     ((message.completed === true) ||
                      // Or it's a legacy/non-streamed assistant message with some text
                      ((message.completed === undefined) && message.text && message.text.trim().length > 0)) &&
                     // Extra guard: hide icons for the message currently streaming
                     (message.chat_id ? (message.chat_id !== streamingMessageId) : (message.id !== streamingMessageId)) && (
                      <div className="flex items-center gap-2 py-1 relative mt-2">
                        {/* Like Button (icon fill only) */}
                        <button
                          onClick={() => handleLike(message)}
                          className={`p-1.5 transition-colors ${likedMessages.has(message.id)
                            ? 'text-[#2861BB]'
                            : (isDarkMode ? 'text-[#A0BEEA] hover:text-[#2861BB]' : 'text-[#787777] hover:text-[#2861BB]')}`}
                          title={likedMessages.has(message.id) ? 'Liked' : 'Like'}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M10.4523 1.85164C10.4644 2.59944 10.2347 3.33122 9.79726 3.93842C9.68341 4.11134 9.53661 4.26023 9.36523 4.37664L9.23284 4.87051H13.2395C13.8703 4.86951 14.4679 5.15291 14.8656 5.64171C15.2632 6.13052 15.4186 6.77245 15.2882 7.38855L13.7831 14.3445C13.5786 15.3107 12.7237 16.0016 11.7344 16H0V4.87051H3.1984L7.92282 0.196127L8.1458 0.00136137H8.42453C9.49319 -0.0381125 10.3959 0.785607 10.4523 1.85164ZM8.64751 1.45515L4.18091 5.8513V14.6088H11.7344C12.0666 14.6169 12.3582 14.3898 12.4312 14.0662L13.9155 7.11032C13.9619 6.90478 13.9125 6.6893 13.7811 6.52438C13.6498 6.35945 13.4506 6.26285 13.2395 6.2617H7.42808L7.665 5.3922L8.07612 3.82712L8.16671 3.54193L8.40362 3.41672C8.52613 3.33722 8.63058 3.23295 8.71022 3.11066C8.96206 2.74073 9.08453 2.29816 9.05863 1.85164C9.05863 1.636 8.94017 1.51775 8.64751 1.45515ZM2.78727 6.2617H1.39364V14.6088H2.78727V6.2617Z" />
                          </svg>
                        </button>
                        {/* Dislike Button (icon fill only, neutral when active) */}
                        <button
                          onClick={() => handleDislike(message)}
                          className={`p-1.5 transition-colors font-semibold ${dislikedMessages.has(message.id)
                            ? (isDarkMode ? 'text-[#E0E0E0]' : 'text-[#333333]')
                            : (isDarkMode ? 'text-[#A0BEEA] hover:text-[#E0E0E0]' : 'text-[#787777] hover:text-[#333333]')}`}
                          title={dislikedMessages.has(message.id) ? 'Disliked' : 'Dislike'}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M8.42453 16.0268C9.49319 16.0664 10.3959 15.2412 10.4523 14.1733C10.4644 13.4242 10.2347 12.6911 9.79726 12.0828C9.68341 11.9096 9.53662 11.7604 9.36523 11.6438L9.23284 11.1491H13.2395C13.8703 11.1501 14.4679 10.8662 14.8656 10.3765C15.2632 9.88687 15.4186 9.24381 15.2882 8.62661L13.7831 1.65843C13.5786 0.69052 12.7237 -0.00156462 11.7344 6.66159e-06H0V11.1491H3.19839L7.92282 15.8317L8.1458 16.0268H8.42453ZM4.18091 10.1666V1.39364H11.7344C12.0666 1.38552 12.3582 1.61303 12.4312 1.93716L13.9155 8.90534C13.9619 9.11124 13.9125 9.32709 13.7811 9.49231C13.6498 9.65753 13.4506 9.7543 13.2395 9.75546H7.42808L7.665 10.6265L8.07612 12.1943L8.16671 12.48L8.40362 12.6054C8.52613 12.6851 8.63058 12.7895 8.71022 12.912C8.96206 13.2826 9.08453 13.726 9.05863 14.1733C9.05863 14.3893 8.94017 14.5078 8.64751 14.5705L4.18091 10.1666ZM1.39364 1.39364H2.78727V9.75546H1.39364V1.39364Z" />
                          </svg>
                        </button>
                        {/* Regenerate Button (shows spinner when active) */}
                        <button
                          onClick={() => !message.isRegenerating && handleReload(message.id)}
                          disabled={message.isRegenerating}
                          className={`p-1.5 transition-colors ${message.isRegenerating
                            ? (isDarkMode ? 'text-[#44B8F3] opacity-80' : 'text-[#2861BB] opacity-80')
                            : (isDarkMode ? 'text-[#A0BEEA] hover:text-[#2861BB]' : 'text-[#787777] hover:text-[#2861BB]')}
                            ${message.isRegenerating ? 'cursor-not-allowed' : ''}`}
                          title={message.isRegenerating ? 'Regenerating...' : 'Reload/Regenerate response'}
                        >
                          {message.isRegenerating ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 15 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" clipRule="evenodd" d="M13.4513 10.4167L14.6667 10.9167C13.5183 13.8932 10.7039 16 7.33333 16C4.9567 16 2.8427 14.9245 1.40075 13.2708V15.3333H0.082397V10.6667H4.69663V12H2.08052C3.27528 13.5911 5.17299 14.6667 7.33333 14.6667C10.1606 14.6667 12.4909 12.9062 13.4513 10.4167ZM7.33333 0C9.6868 0 11.8214 1.05469 13.2659 2.72917V0.666668H14.5843V5.33333H9.97004V4H12.5655C11.3759 2.39323 9.47051 1.33333 7.33333 1.33333C4.50609 1.33333 2.1758 3.09375 1.21536 5.58333L0 5.08333C1.14841 2.10677 3.96278 0 7.33333 0Z" />
                            </svg>
                          )}
                        </button>
                        {/* Copy Button (icon fill only) */}
                        <button
                          onClick={() => handleCopy(message.text, message.id)}
                          className={`p-1.5 transition-colors relative ${copiedMessage === message.id
                            ? 'text-[#2861BB]'
                            : (isDarkMode ? 'text-[#A0BEEA] hover:text-[#2861BB]' : 'text-[#787777] hover:text-[#2861BB]')}`}
                          title={copiedMessage === message.id ? 'Copied' : 'Copy'}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0 0V0.727273V11.6364V12.3636H0.727273H2.90909V10.9091H1.45455V1.45455H10.9091V2.90909H12.3636V0.727273V0H11.6364H0.727273H0ZM3.63636 3.63636V4.36364V15.2727V16H4.36364H15.2727H16V15.2727V4.36364V3.63636H15.2727H4.36364H3.63636ZM5.09091 5.09091H14.5455V14.5455H5.09091V5.09091Z" />
                          </svg>
                          {copiedMessage === message.id && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
                              Copied!
                            </div>
                          )}
                        </button>
                        
                        {/* Reference Links Icon */}
                        <button 
                          onClick={() => handleReferenceLinks(message.originalText || message.text, message.id)}
                          className={`p-1.5 transition-colors relative ${
                            extractReferenceLinks(message.originalText || message.text).length === 0
                              ? 'opacity-30 cursor-not-allowed'
                              : (isDarkMode ? 'text-[#A0BEEA] hover:text-[#2861BB]' : 'text-[#787777] hover:text-[#2861BB]')
                          }`}
                          disabled={extractReferenceLinks(message.originalText || message.text).length === 0}
                          title={extractReferenceLinks(message.originalText || message.text).length > 0 ? 'View Reference Links' : 'No reference links available'}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.5 1C5.67157 1 5 1.67157 5 2.5C5 3.32843 5.67157 4 6.5 4H9.5C10.3284 4 11 3.32843 11 2.5C11 1.67157 10.3284 1 9.5 1H6.5ZM3.5 2.5C3.5 0.84315 4.84315 -0.5 6.5 -0.5H9.5C11.1569 -0.5 12.5 0.84315 12.5 2.5C12.5 4.15685 11.1569 5.5 9.5 5.5H6.5C4.84315 5.5 3.5 4.15685 3.5 2.5ZM6.5 12C5.67157 12 5 12.6716 5 13.5C5 14.3284 5.67157 15 6.5 15H9.5C10.3284 15 11 14.3284 11 13.5C11 12.6716 10.3284 12 9.5 12H6.5ZM3.5 13.5C3.5 11.8431 4.84315 10.5 6.5 10.5H9.5C11.1569 10.5 12.5 11.8431 12.5 13.5C12.5 15.1569 11.1569 16.5 9.5 16.5H6.5C4.84315 16.5 3.5 15.1569 3.5 13.5ZM8 6.75C8.41421 6.75 8.75 7.08579 8.75 7.5V8.5C8.75 8.91421 8.41421 9.25 8 9.25C7.58579 9.25 7.25 8.91421 7.25 8.5V7.5C7.25 7.08579 7.58579 6.75 8 6.75Z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div className={`p-5 ${isDarkMode ? '' : 'bg-[#F9FAFB] border-gray-200 border-t'} flex-shrink-0`}>
          {/* End Chat Controls for Live Agent - Above Input */}
          {liveAgent && !chatEnded && !showConfirm && (
            <div className="max-w-[760px] mx-auto mb-3">
              <div className="text-center">
                <button
                  onClick={confirmEndChat}
                  className={`px-4 py-2 rounded-full border transition-all hover:shadow-md ${
                    isDarkMode 
                      ? 'bg-transparent border-[#A0BEEA] text-[#A0BEEA] hover:bg-[#A0BEEA] hover:text-[#072056]' 
                      : 'bg-white border-[#1a3673] text-[#1a3673] hover:bg-[#1a3673] hover:text-white'
                  }`}
                >
                  End Chat
                </button>
              </div>
            </div>
          )}
          {showConfirm && (
            <div className="max-w-[760px] mx-auto mb-3">
              <div className="text-center">
                <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full border ${
                  isDarkMode 
                    ? 'bg-transparent border-[#A0BEEA] text-white' 
                    : 'bg-white border-[#1a3673] text-[#1a3673]'
                }`}>
                  <span className="font-semibold">End Chat?</span>
                  <button
                    onClick={endChat}
                    className={`px-3 py-1 rounded-full font-bold transition-all ${
                      isDarkMode 
                        ? 'bg-[#A0BEEA] text-[#072056] hover:bg-white' 
                        : 'bg-[#1a3673] text-white hover:bg-[#0f1f4d]'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={cancelEndChat}
                    className={`px-3 py-1 rounded-full font-bold border transition-all ${
                      isDarkMode 
                        ? 'border-[#A0BEEA] text-[#A0BEEA] hover:bg-[#A0BEEA] hover:text-[#072056]' 
                        : 'border-[#1a3673] text-[#1a3673] hover:bg-[#1a3673] hover:text-white'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="max-w-[760px] mx-auto">
            <div 
              className={`flex items-center gap-3 px-4 py-3 border-2 shadow-lg ${isDarkMode ? 'border-[#2861BB]' : 'bg-white border-[#44B8F3] rounded-full'}`}
              style={isDarkMode ? {
                borderRadius: '999px',
                border: '2px solid #2861BB',
                background: 'linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)'
              } : {}}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 24C10.4551 18.1296 5.87044 13.5449 0 12C5.87044 10.4551 10.4551 5.87044 12 0C13.5449 5.87044 18.1296 10.4551 24 12C18.1296 13.5449 13.5449 18.1296 12 24Z" fill="url(#paint0_linear_gradient)"/>
                <defs>
                  <linearGradient id="paint0_linear_gradient" x1="18.0351" y1="6.01092" x2="6.01958" y2="16.5376" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#44B8F3"/>
                    <stop offset="1" stopColor="#2861BB"/>
                  </linearGradient>
                </defs>
              </svg>
              
              <input
                type="text"
                placeholder={isInputFocused ? "" : "Ask anything"}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                disabled={isLiveAgentCardShowing || loading}
                className={`flex-1 bg-transparent border-none outline-none text-xl ${
                  isDarkMode 
                    ? 'text-white placeholder-[#A0BEEA]' 
                    : 'text-[#2861BB] placeholder-[#787777]'
                } ${(isLiveAgentCardShowing || loading) ? 'cursor-not-allowed opacity-50' : ''}`}
              />
              
              <button 
                onClick={handleSendMessage}
                disabled={loading || !userInput.trim()}
                className={`p-2 hover:${isDarkMode ? 'bg-[#2861BB]' : 'bg-gray-100'} rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.975 17.0004L18.2437 10.7671C18.9525 10.4754 18.9525 9.52542 18.2437 9.23375L2.975 3.00042C2.3975 2.75875 1.75875 3.16709 1.75875 3.75875L1.75 7.60042C1.75 8.01709 2.07375 8.37542 2.51125 8.42542L14.875 10.0004L2.51125 11.5671C2.07375 11.6254 1.75 11.9838 1.75 12.4004L1.75875 16.2421C1.75875 16.8338 2.3975 17.2421 2.975 17.0004Z" fill="#0C7DB6"/>
                  </svg>
                )}
              </button>
              
              <button className={`p-2 hover:${isDarkMode ? 'bg-[#2861BB]' : 'bg-gray-100'} rounded-full transition-colors`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.9989 14C13.6776 14 15.0328 12.66 15.0328 11V5C15.0328 3.34 13.6776 2 11.9989 2C10.3202 2 8.9651 3.34 8.9651 5V11C8.9651 12.66 10.3202 14 11.9989 14ZM17.9756 11C17.48 11 17.0654 11.36 16.9845 11.85C16.5699 14.2 14.4968 16 11.9989 16C9.50107 16 7.42796 14.2 7.01333 11.85C6.93243 11.36 6.51781 11 6.02228 11C5.40541 11 4.91999 11.54 5.01101 12.14C5.50653 15.14 7.93359 17.49 10.9876 17.92V20C10.9876 20.55 11.4427 21 11.9989 21C12.5551 21 13.0102 20.55 13.0102 20V17.92C16.0643 17.49 18.4913 15.14 18.9868 12.14C19.088 11.54 18.5924 11 17.9756 11Z" fill="#949494"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sources Sidebar (Reference Links) */}
      {showReferenceLinks && (
        <div
          className="fixed right-0 top-0 h-full w-[360px] shadow-2xl border-l z-40 flex flex-col"
          style={{
            background: isDarkMode
              ? 'linear-gradient(160deg, rgba(7,32,86,0.94) 0%, rgba(0,11,35,0.98) 100%)'
              : '#FFFFFF',
            borderColor: isDarkMode ? '#1F3E81' : '#E5E7EB'
          }}
        >
          {/* Header Row with tabs */}
          <div className={`flex items-center px-4 pt-3 pb-0 border-b ${isDarkMode ? 'border-[#1F3E81]' : 'border-gray-200'}`}>
            {/* X close icon */}
            <button
              onClick={() => setShowReferenceLinks(false)}
              aria-label="Close sources"
              className={`mr-3 p-1 rounded hover:${isDarkMode ? 'bg-[#1F3E81]' : 'bg-gray-100'} transition-colors`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.3 1.7L12.3 0.7L7 6L1.7 0.7L0.7 1.7L6 7L0.7 12.3L1.7 13.3L7 8L12.3 13.3L13.3 12.3L8 7L13.3 1.7Z" fill={isDarkMode ? '#A0BEEA' : '#1a366f'} />
              </svg>
            </button>
            {/* Tabs */}
            <div className="flex items-center gap-6">
              <button
                className={`pb-2 text-sm font-semibold border-b-2 ${
                  activeSourcesTab === 'sources'
                    ? (isDarkMode ? 'border-[#2861BB] text-[#A0BEEA]' : 'border-[#2861BB] text-[#1a366f]')
                    : 'border-transparent text-gray-500'
                }`}
                onClick={() => setActiveSourcesTab('sources')}
              >
                <span>Sources</span>
                <span
                  className={`ml-2 inline-flex items-center justify-center rounded-full text-[11px] leading-none px-1.5 py-0.5 ${
                    isDarkMode ? 'bg-[#1F3E81] text-white' : 'bg-[#1a366f] text-white'
                  }`}
                >
                  {currentReferenceLinks.length}
                </span>
              </button>
              <button
                className={`pb-2 text-sm font-semibold border-b-2 ${
                  activeSourcesTab === 'related'
                    ? (isDarkMode ? 'border-[#2861BB] text-[#A0BEEA]' : 'border-[#2861BB] text-[#1a366f]')
                    : 'border-transparent text-gray-500'
                }`}
                onClick={() => setActiveSourcesTab('related')}
              >
                <span>Related Links</span>
                <span
                  className={`ml-2 inline-flex items-center justify-center rounded-full text-[11px] leading-none px-1.5 py-0.5 ${
                    isDarkMode ? 'bg-[#1F3E81] text-[#A0BEEA]' : 'bg-[#EAF5FF] text-[#1a366f]'
                  }`}
                >
                  {Array.isArray(relatedLinks) ? relatedLinks.length : 0}
                </span>
              </button>
            </div>
          </div>
          {/* Body */}
          <div className="p-4 overflow-y-auto flex-1">
            {/* Descriptive text under tab (only for Sources) */}
            {activeSourcesTab === 'sources' && (
              <p className={`${isDarkMode ? 'text-[#A0BEEA]/80' : 'text-[#787777]'} text-sm leading-6 mb-6 text-left`}>
                This section provides a list of references and materials used to generate the insights and information for this response.
              </p>
            )}
            {activeSourcesTab === 'sources' ? (
              Array.isArray(currentReferenceLinks) && currentReferenceLinks.length > 0 ? (
              <ul className="space-y-5 text-left">
                {currentReferenceLinks.map((l, idx) => (
                  <li key={`${l.url}-${idx}`} className="pb-1">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group inline-flex items-center gap-2 ${isDarkMode ? 'text-[#A0BEEA] hover:text-white' : 'text-[#2861BB] hover:text-[#1f4a9c]'} font-semibold underline decoration-2 underline-offset-[3px]`}
                      title={l.title || l.url}
                    >
                      <span className="truncate max-w-[280px]">{l.title || l.url}</span>
                      {/* Open in new tab icon */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80 group-hover:opacity-100">
                        <path d="M14 3H21V10" stroke={isDarkMode ? '#A0BEEA' : '#2861BB'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 14L21 3" stroke={isDarkMode ? '#A0BEEA' : '#2861BB'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 14V21H3V3H10" stroke={isDarkMode ? '#A0BEEA' : '#2861BB'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
              ) : (
                <div className={`${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'} text-sm`}>No sources found in this message.</div>
              )
            ) : (
              <div className={`${isDarkMode ? 'text-[#A0BEEA]' : 'text-gray-600'} text-sm`}>No related links available.</div>
            )}
          </div>
        </div>
      )}
    </div>
    {/* Closing root container */}
  </div>
  );
};

export default ChatPage;


