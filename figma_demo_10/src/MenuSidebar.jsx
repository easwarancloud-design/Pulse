import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, ArrowLeft, Sun, Edit2, Trash2, Check, X } from 'lucide-react';
import ChatIcon from './components/ChatIcon';
// Replacing vector components with branded PNG icons
// (Jira & ServiceNow) sourced from public/icons for consistency with loading banner assets
// import JiraIcon from './components/JiraIcon';
// import ServiceNowIcon from './components/ServiceNowIcon';
import { hybridChatService } from './services/hybridChatService';
import { localConversationManager } from './services/localConversationManager';

const MenuSidebar = ({ onBack, onToggleTheme, isDarkMode, onNewChat, onThreadSelect, currentActiveThread, isNewChatActive, onAddConversationImmediate, onThreadUpdate, isNewChatDisabled }) => {
  const [isDarkModeLocal, setIsDarkModeLocal] = useState(isDarkMode || false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null); // For API search results
  const [isSearching, setIsSearching] = useState(false); // Search loading state
  
  // Ref for search input to focus when expanded
  const searchInputRef = useRef(null);
  // Map of threadId -> DOM element to auto-scroll into view when active changes
  const threadItemRefs = useRef(new Map());
  const pendingTitleUpdatesRef = useRef(new Map());
  const activeThreadRef = useRef(currentActiveThread);

  const isPlaceholderThreadId = (threadId) =>
    typeof threadId === 'string' && (threadId.startsWith('thread_') || threadId.startsWith('local_'));

  const getPendingTitleEntry = (threadId) => {
    const entry = pendingTitleUpdatesRef.current.get(threadId);
    if (!entry) return null;
    if (typeof entry === 'string') {
      return { title: entry, lastAttempt: 0 };
    }
    return entry;
  };

  const setPendingTitleEntry = (threadId, title, lastAttempt = 0) => {
    if (!threadId || !title) return;
    pendingTitleUpdatesRef.current.set(threadId, { title, lastAttempt });
  };

  const clearPendingTitleEntry = (threadId) => {
    if (!threadId) return;
    pendingTitleUpdatesRef.current.delete(threadId);
  };

  useEffect(() => {
    activeThreadRef.current = currentActiveThread;
  }, [currentActiveThread]);

  // Auto-scroll the sidebar so the highlighted thread is visible when selection changes
  useEffect(() => {
    try {
      const activeId = currentActiveThread?.id;
      if (!activeId) return;
      const el = threadItemRefs.current.get(activeId);
      if (el && typeof el.scrollIntoView === 'function') {
        // Center the active item in view for better visibility, with smooth scroll
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      }
    } catch (e) {
      // Non-fatal: just avoid breaking the UI if something goes wrong
      console.warn('Sidebar auto-scroll skipped:', e);
    }
  }, [currentActiveThread?.id]);

  // Load threads from conversation API (no localStorage fallback)
  const loadThreadsFromStorage = async () => {
    try {
      // 🆔 Set the domain ID for conversation storage (same as ChatPage), from Okta only
      const oktaUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const DOMAIN_ID = oktaUser.domainId || oktaUser.domain_id || null;
      if (!DOMAIN_ID) {
        console.warn('⚠️ No domainId found; skipping API thread load');
        return { today: [], yesterday: [], lastWeek: [], last30Days: [] };
      }
      hybridChatService.setUserId(DOMAIN_ID);
      
  // 🔄 Try to load conversations from API first (bypass cache on initial load to get fresh data)
      const conversations = await hybridChatService.getConversationHistory(50, 0, false); // useCache=false
      
      console.log('🔍 [DEBUG] Raw API response:', {
        isArray: Array.isArray(conversations),
        count: conversations?.length || 0,
        conversations: conversations
      });
      
      if (conversations && Array.isArray(conversations) && conversations.length > 0) {
        // Overlay: recent interactions map to preserve optimistic reordering across refresh
        const RECENT_KEY = 'recent_conversation_interactions';
        let recentMap = {};
        try { recentMap = JSON.parse(localStorage.getItem(RECENT_KEY) || '{}'); } catch (_) { recentMap = {}; }
        // Convert API conversations to thread format
        const today = [];
        const yesterday = [];
        const lastWeek = [];
        const last30Days = [];
        
  const now = new Date();
  // Normalize comparisons by local calendar day boundaries to avoid timezone drift
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const lastWeekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30DaysStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // Deduplicate by id to prevent multiple entries with same id appearing selected together
        const seenIds = new Set();
        let processedCount = 0;
        let skippedDeleted = 0;
        let skippedDuplicate = 0;
        
        conversations.forEach(conv => {
          if (!conv || !conv.id) return;
          if (seenIds.has(conv.id)) {
            skippedDuplicate++;
            return;
          }
          
          // Skip deleted conversations
          if (conv.status === 'deleted') {
            console.log('⏭️ Skipping deleted conversation:', conv.id);
            skippedDeleted++;
            return;
          }
          
          seenIds.add(conv.id);
          processedCount++;

          const thread = {
            id: conv.id,
            title: conv.title,
            conversation: conv.messages ? conv.messages.map(msg => ({
              type: msg.message_type,
              text: msg.content
            })) : []
          };
          // Prefer the most recent timestamp available (updated_at or last_message_at), then created
          const tsRaw = conv.updated_at || conv.last_message_at || conv.createdAt || conv.created_at;
          const createdAt = tsRaw ? new Date(tsRaw) : new Date();
          const updatedAt = conv.updated_at ? new Date(conv.updated_at) : createdAt;
          const recentTs = recentMap[conv.id] ? new Date(recentMap[conv.id]).getTime() : 0;
          const effectiveMs = Math.max(createdAt.getTime(), updatedAt.getTime(), recentTs);
          const sortTs = effectiveMs;

          // Debug logging for timestamp comparison (only for conversations with recentTs)
          if (recentTs > 0) {
            console.log(`📊 Timestamp comparison for ${conv.id}:`, {
              title: conv.title?.substring(0, 30),
              createdAt: createdAt.getTime(),
              updatedAt: updatedAt.getTime(),
              recentTs: recentTs,
              effectiveMs: effectiveMs,
              winner: effectiveMs === recentTs ? 'PROMOTED' : (effectiveMs === updatedAt.getTime() ? 'updated_at' : 'created_at')
            });
          }

          // Use local calendar day grouping with a grace window to account for UTC/region differences
          const msAgo = now.getTime() - effectiveMs;
          const GRACE_WINDOW_MS = 18 * 60 * 60 * 1000; // 18 hours
          if (effectiveMs >= todayStart.getTime() || msAgo < GRACE_WINDOW_MS) {
            today.push({ ...thread, _sortTs: sortTs });
          } else if (effectiveMs >= yesterdayStart.getTime()) {
            yesterday.push({ ...thread, _sortTs: sortTs });
          } else if (effectiveMs >= lastWeekStart.getTime()) {
            lastWeek.push({ ...thread, _sortTs: sortTs });
          } else if (effectiveMs >= last30DaysStart.getTime()) {
            last30Days.push({ ...thread, _sortTs: sortTs });
          }
        });

        console.log('📊 [DEBUG] Conversation processing summary:', {
          totalFromAPI: conversations.length,
          processed: processedCount,
          skippedDeleted: skippedDeleted,
          skippedDuplicate: skippedDuplicate,
          categorized: {
            today: today.length,
            yesterday: yesterday.length,
            lastWeek: lastWeek.length,
            last30Days: last30Days.length
          }
        });

        // Sort each group by most recent update time, descending
        const sortDesc = (a, b) => (b?._sortTs || 0) - (a?._sortTs || 0);
        today.sort(sortDesc);
        yesterday.sort(sortDesc);
        lastWeek.sort(sortDesc);
        last30Days.sort(sortDesc);

        // Strip helper field before returning
        const strip = arr => arr.map(({ _sortTs, ...rest }) => rest);
        
        console.log('✅ Loaded threads from conversation API:', { 
          today: today.length, 
          yesterday: yesterday.length, 
          lastWeek: lastWeek.length, 
          last30Days: last30Days.length 
        });
        
        const resultThreads = { today: strip(today), yesterday: strip(yesterday), lastWeek: strip(lastWeek), last30Days: strip(last30Days) };

        // Backend preloading: hydrate messages for each conversation once in the background
        try {
          const allIds = [
            ...today.map(t => t.id),
            ...yesterday.map(t => t.id),
            ...lastWeek.map(t => t.id),
            ...last30Days.map(t => t.id)
          ].filter(Boolean);
          const uniqueIds = Array.from(new Set(allIds));
          if (uniqueIds.length > 0) {
            // Preload limited messages for responsiveness
            hybridChatService.preloadConversations(uniqueIds, { messageLimit: 20 });
          }
        } catch (preErr) {
          console.warn('⚠️ Conversation preload skipped:', preErr);
        }

        return resultThreads;
      } else {
        console.log('📭 No conversations found in API, using empty structure');
        return {
          today: [],
          yesterday: [],
          lastWeek: [],
          last30Days: []
        };
      }
    } catch (error) {
      console.error('❌ Failed to load threads from API:', error);
      // Return empty structure if API fails - no localStorage fallback
      return {
        today: [],
        yesterday: [],
        lastWeek: [],
        last30Days: []
      };
    }
  };

  const [allThreads, setAllThreads] = useState({
    today: [],
    yesterday: [],
    lastWeek: [],
    last30Days: []
  });

  // Function to immediately add a new conversation to the sidebar
  const addConversationImmediately = (conversationId, title) => {
    // Prevent duplicates: if a thread with the same ID already exists in any group, just update its title
    const existsInAnyGroup = (threadsObj) => {
      const groups = ['today', 'yesterday', 'lastWeek', 'last30Days'];
      for (const g of groups) {
        const arr = Array.isArray(threadsObj[g]) ? threadsObj[g] : [];
        if (arr.some(t => t && t.id === conversationId)) return true;
      }
      return false;
    };

    // New Chat placeholder de-duplication: allow only one placeholder at a time
    const hasExistingNewChatPlaceholder = (() => {
      if (title !== 'New Chat') return false;
      const groups = ['today', 'yesterday', 'lastWeek', 'last30Days'];
      for (const g of groups) {
        const arr = Array.isArray(allThreads[g]) ? allThreads[g] : [];
        if (arr.some(t => t && t.title === 'New Chat')) return true;
      }
      return false;
    })();

    if (hasExistingNewChatPlaceholder) {
      console.log('\u2139\ufe0f Skipped adding secondary "New Chat" placeholder to prevent duplicates');
      return;
    }

    if (existsInAnyGroup(allThreads)) {
      // If it exists, update the title and return
      updateConversationTitle(conversationId, title);
      console.log('\u2139\ufe0f Skipped adding duplicate conversation, updated title instead:', { conversationId, title });
      return;
    }

    const newThread = {
      id: conversationId,
      title: title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      message_count: 1,
      status: 'active'
    };

    // Add to today's conversations at the top, but first remove any existing entries with the same ID across all groups
    setAllThreads(prev => {
      const safePrev = {
        today: Array.isArray(prev.today) ? prev.today : [],
        yesterday: Array.isArray(prev.yesterday) ? prev.yesterday : [],
        lastWeek: Array.isArray(prev.lastWeek) ? prev.lastWeek : [],
        last30Days: Array.isArray(prev.last30Days) ? prev.last30Days : []
      };

      const pruneId = (threads) => threads.filter(t => t && t.id !== conversationId);

      return {
        today: [newThread, ...pruneId(safePrev.today)],
        yesterday: pruneId(safePrev.yesterday),
        lastWeek: pruneId(safePrev.lastWeek),
        last30Days: pruneId(safePrev.last30Days)
      };
    });

    console.log('\u2705 Immediately added conversation to sidebar:', { conversationId, title });
  };

  // Function to update the title of an existing conversation
  const updateConversationTitle = (conversationId, newTitle) => {
    setAllThreads(prev => {
      const updateThreads = (threads) => 
        threads.map(thread => 
          thread.id === conversationId 
            ? { ...thread, title: newTitle, updated_at: new Date().toISOString() }
            : thread
        );

      return {
        today: updateThreads(prev.today),
        yesterday: updateThreads(prev.yesterday),
        lastWeek: updateThreads(prev.lastWeek),
        last30Days: updateThreads(prev.last30Days)
      };
    });

    console.log('✅ Updated conversation title in sidebar:', { conversationId, newTitle });
  };

  // Function to update the conversation ID (for when frontend temp ID becomes backend ID)
  const updateConversationId = (oldId, newId, newTitle = null) => {
    if (!oldId || !newId || oldId === newId) return;

  const pendingEntry = getPendingTitleEntry(oldId);
  const pendingTitle = newTitle || pendingEntry?.title; // Use passed title or pending title

    setAllThreads(prev => {
      const updateThreads = (threads) => 
        threads.map(thread => {
          if (thread.id !== oldId) return thread;
          const updatedThread = {
            ...thread,
            id: newId,
            updated_at: new Date().toISOString()
          };
          if (pendingTitle) {
            updatedThread.title = pendingTitle;
          }
          return updatedThread;
        });

      const result = {
        today: updateThreads(prev.today),
        yesterday: updateThreads(prev.yesterday),
        lastWeek: updateThreads(prev.lastWeek),
        last30Days: updateThreads(prev.last30Days)
      };

      console.log('✅ Updated conversation ID in sidebar:', { oldId, newId, title: pendingTitle || 'no title' });
      return result;
    });

    // Clean up temp ID from localStorage if it's a temp ID
    if (oldId && oldId.startsWith('thread_')) {
      try {
        // Migrate promotion timestamp from temp ID to backend ID
        const RECENT_KEY = 'recent_conversation_interactions';
        const map = JSON.parse(localStorage.getItem(RECENT_KEY) || '{}');
        if (map[oldId]) {
          map[newId] = map[oldId]; // Copy promotion timestamp to new ID
          delete map[oldId]; // Remove old temp ID
          localStorage.setItem(RECENT_KEY, JSON.stringify(map));
          console.log('🔄 Migrated promotion timestamp from temp ID to backend ID:', { oldId, newId, timestamp: map[newId] });
        }
        
        // Clean up temp conversation from storage
        localConversationManager.deleteConversation(oldId);
        console.log('🧹 Cleaned up temp conversation from localStorage:', oldId);
      } catch (error) {
        console.warn('⚠️ Failed to clean up temp conversation:', error);
      }
    }

    if (currentActiveThread?.id === oldId && onThreadUpdate) {
      onThreadUpdate({ ...currentActiveThread, id: newId, ...(pendingTitle ? { title: pendingTitle } : {}) });
    }

    if (pendingTitle) {
      clearPendingTitleEntry(oldId);

      try {
        localConversationManager.updateConversationTitle(newId, pendingTitle);
      } catch (localError) {
        console.warn('⚠️ Failed to migrate pending title to new ID in local storage:', localError);
      }

      setAllThreads(prev => {
        const applyTitle = (threads) =>
          threads.map(thread =>
            thread.id === newId ? { ...thread, title: pendingTitle } : thread
          );
        return {
          today: applyTitle(prev.today || []),
          yesterday: applyTitle(prev.yesterday || []),
          lastWeek: applyTitle(prev.lastWeek || []),
          last30Days: applyTitle(prev.last30Days || [])
        };
      });

      (async () => {
        try {
          const oktaUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
          const domainId = oktaUser.domainId || oktaUser.domain_id || null;
          if (!domainId) {
            console.warn('⚠️ No domainId; pending title update will retry when backend ID refreshes');
            setPendingTitleEntry(newId, pendingTitle, Date.now());
            return;
          }
          hybridChatService.setUserId(domainId);
          const result = await hybridChatService.updateConversation(newId, { title: pendingTitle });
          if (result && result.success === false) {
            console.warn('⚠️ Pending backend title update reported failure:', result);
            setPendingTitleEntry(newId, pendingTitle, Date.now());
          } else {
            clearPendingTitleEntry(newId);
            console.log('✅ Applied deferred title update to backend:', pendingTitle);
          }
        } catch (error) {
          console.warn('⚠️ Failed to apply deferred title update to backend:', error);
          setPendingTitleEntry(newId, pendingTitle, Date.now());
        }
      })();
    }
  };

  // Promote a conversation to the top of Today's category
  const promoteConversationToTodayTop = (conversationId) => {
    if (!conversationId) return;
    // Persist a recent interaction timestamp so refresh keeps this at the top
    try {
      const RECENT_KEY = 'recent_conversation_interactions';
      // Use a timestamp slightly in the future to ensure it always sorts first
      const nowIso = new Date(Date.now() + 1000).toISOString(); // +1 second to guarantee top position
      const map = JSON.parse(localStorage.getItem(RECENT_KEY) || '{}');
      map[conversationId] = nowIso;
      console.log('📌 Setting promotion timestamp for:', conversationId, nowIso);
      // Prune old entries > 3 days to avoid unbounded growth
      const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
      const cutoff = Date.now() - THREE_DAYS;
      for (const [k, v] of Object.entries(map)) {
        if (!v || isNaN(Date.parse(v)) || Date.parse(v) < cutoff) delete map[k];
      }
      localStorage.setItem(RECENT_KEY, JSON.stringify(map));
    } catch (_) {}
    setAllThreads(prev => {
      const safePrev = {
        today: Array.isArray(prev.today) ? prev.today : [],
        yesterday: Array.isArray(prev.yesterday) ? prev.yesterday : [],
        lastWeek: Array.isArray(prev.lastWeek) ? prev.lastWeek : [],
        last30Days: Array.isArray(prev.last30Days) ? prev.last30Days : []
      };

      // Find existing thread data if present in any group
      const existing = [...safePrev.today, ...safePrev.yesterday, ...safePrev.lastWeek, ...safePrev.last30Days]
        .find(t => t && t.id === conversationId);
      const nowIso = new Date().toISOString();
      const thread = existing ? { ...existing, updated_at: nowIso, last_message_at: nowIso } : { id: conversationId, title: existing?.title || 'Untitled', updated_at: nowIso, last_message_at: nowIso };

      const pruneId = (threads) => threads.filter(t => t && t.id !== conversationId);

      return {
        today: [thread, ...pruneId(safePrev.today)],
        yesterday: pruneId(safePrev.yesterday),
        lastWeek: pruneId(safePrev.lastWeek),
        last30Days: pruneId(safePrev.last30Days)
      };
    });

    console.log('\u2705 Promoted conversation to Today top:', { conversationId });
  };

  // Expose all functions to parent component
  useEffect(() => {
    if (onAddConversationImmediate && onAddConversationImmediate.current !== undefined) {
      onAddConversationImmediate.current = {
        addConversation: addConversationImmediately,
        updateTitle: updateConversationTitle,
        updateId: updateConversationId,
        promoteToTodayTop: promoteConversationToTodayTop
      };
    }
  }, [onAddConversationImmediate]);

  // Load threads from API on component mount
  useEffect(() => {
    const loadThreads = async () => {
      try {
        const threads = await loadThreadsFromStorage();
        
        // Validate the threads structure and ensure it has the required properties
        if (threads && typeof threads === 'object') {
          // Merge API threads with existing manually-managed threads (like "New Chat")
          setAllThreads(prev => {
            const mergeThreads = (apiThreads, existingThreads) => {
              const apiIds = new Set(apiThreads.map(t => t.id));

              // Keep manually-added threads that aren't in the API response
              const manualThreads = existingThreads.filter(t => t && !apiIds.has(t.id));

              // Preserve ordering of existing manual threads but ensure placeholder "thread_" IDs stay on top
              const placeholderManual = manualThreads.filter(t => t?.id?.startsWith('thread_'));
              const otherManual = manualThreads.filter(t => !t?.id?.startsWith('thread_'));

              // Combine with manual placeholders first so "New Chat" remains visible until persisted
              const combined = [...placeholderManual, ...apiThreads, ...otherManual];

              // Remove duplicates based on ID, keeping the first occurrence (manual placeholder wins)
              const seen = new Set();
              const deduped = combined.filter(thread => {
                if (!thread || seen.has(thread.id)) {
                  return false;
                }
                seen.add(thread.id);
                return true;
              });

              if (placeholderManual.length > 0) {
                console.log('📌 Preserving placeholder threads during merge:', placeholderManual.map(t => t.id));
              }

              return deduped;
            };

            return {
              today: mergeThreads(
                Array.isArray(threads.today) ? threads.today : [], 
                Array.isArray(prev.today) ? prev.today : []
              ),
              yesterday: mergeThreads(
                Array.isArray(threads.yesterday) ? threads.yesterday : [], 
                Array.isArray(prev.yesterday) ? prev.yesterday : []
              ),
              lastWeek: mergeThreads(
                Array.isArray(threads.lastWeek) ? threads.lastWeek : [], 
                Array.isArray(prev.lastWeek) ? prev.lastWeek : []
              ),
              last30Days: mergeThreads(
                Array.isArray(threads.last30Days) ? threads.last30Days : [], 
                Array.isArray(prev.last30Days) ? prev.last30Days : []
              )
            };
          });
          // Auto-select the first available conversation on initial load if none is active
          try {
            const activeThread = activeThreadRef.current;
            if (!activeThread || !activeThread.id) {
              // Check if we should prevent auto-thread selection (e.g., after new chat creation)
              if (window.__preventAutoThreadSelect) {
                console.log('🚫 MenuSidebar: Prevented auto-thread selection due to recent new chat creation');
                return;
              }
              
              const first = (threads.today && threads.today[0])
                || (threads.yesterday && threads.yesterday[0])
                || (threads.lastWeek && threads.lastWeek[0])
                || (threads.last30Days && threads.last30Days[0]);
              if (first && first.id && first.id !== activeThread?.id && onThreadSelect) {
                onThreadSelect(first);
              }
            }
          } catch (_) {}
        } else {
          console.warn('⚠️ Invalid threads structure from API, using empty defaults');
          setAllThreads({
            today: [],
            yesterday: [],
            lastWeek: [],
            last30Days: []
          });
        }
      } catch (error) {
        console.error('❌ Failed to load threads from API:', error);
        // Set empty structure if API fails - no static data fallback
        setAllThreads({
          today: [],
          yesterday: [],
          lastWeek: [],
          last30Days: []
        });
      }
    };
    
    loadThreads();
  }, []);
  
  // Enhanced search function using conversation API
  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    console.log(`🔍 Starting search for: "${query}"`);
    
    try {
      // Use the conversation API to search
      const apiResults = await hybridChatService.searchConversationHistory(query);
      console.log(`📊 API returned ${apiResults?.length || 0} results:`, apiResults);
      
      // If we have API results, use them
      if (apiResults && apiResults.length > 0) {
        // Helper function to categorize conversations by date
        const categorizeByDate = (conversations) => {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
          const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

          const categorized = {
            today: [],
            yesterday: [],
            lastWeek: [],
            last30Days: []
          };

          conversations.forEach(result => {
            const createdAt = new Date(result.created_at || result.updated_at || Date.now());
            const conversation = {
              id: result.id,
              title: result.title || 'Untitled conversation',
              conversation: result.conversation || []
            };

            if (createdAt >= today) {
              categorized.today.push(conversation);
            } else if (createdAt >= yesterday) {
              categorized.yesterday.push(conversation);
            } else if (createdAt >= lastWeek) {
              categorized.lastWeek.push(conversation);
            } else if (createdAt >= last30Days) {
              categorized.last30Days.push(conversation);
            } else {
              // Older than 30 days, still put in last30Days section
              categorized.last30Days.push(conversation);
            }
          });

          return categorized;
        };

        const transformedResults = categorizeByDate(apiResults);
        console.log(`✅ Setting categorized search results:`, transformedResults);
        setSearchResults(transformedResults);
      } else {
        // API returned empty results - use local search
        console.log('API search returned no results, using local search for:', query);
        setSearchResults(null); // Clear API results to use local filtering
      }
    } catch (error) {
      console.error('API search failed, using local search:', error);
      // API failed - clear search results to use local filtering
      setSearchResults(null);
    }
    setIsSearching(false);
  };

  // Local search fallback function
  const getFilteredThreadsLocal = (query) => {
    // Ensure allThreads exists and has proper structure
    const safeAllThreads = {
      today: (allThreads && allThreads.today) || [],
      yesterday: (allThreads && allThreads.yesterday) || [],
      lastWeek: (allThreads && allThreads.lastWeek) || [],
      last30Days: (allThreads && allThreads.last30Days) || []
    };

    const filterThreadsArray = (threads) => 
      threads.filter(thread => 
        thread && thread.title && thread.title.toLowerCase().includes(query.toLowerCase())
      );
    
    return {
      today: filterThreadsArray(safeAllThreads.today),
      yesterday: filterThreadsArray(safeAllThreads.yesterday),
      lastWeek: filterThreadsArray(safeAllThreads.lastWeek),
      last30Days: filterThreadsArray(safeAllThreads.last30Days)
    };
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter threads based on search query
  const getFilteredThreads = () => {
    // Quiet noisy logs to keep console readable during debugging
    
    // If we have search results from API, use those
    if (searchResults !== null && searchQuery.trim()) {
      // console.log(`✅ Using API search results`);
      return searchResults;
    }

    // Otherwise use local filtering with safety checks
    const safeAllThreads = {
      today: (allThreads && allThreads.today) || [],
      yesterday: (allThreads && allThreads.yesterday) || [],
      lastWeek: (allThreads && allThreads.lastWeek) || [],
      last30Days: (allThreads && allThreads.last30Days) || []
    };

    // If there's a search query but no API results, filter locally
    if (searchQuery.trim()) {
      // console.log(`🔍 Using local filtering for: "${searchQuery}"`);
      const localResults = getFilteredThreadsLocal(searchQuery);
      // console.log(`📊 Local filtering results:`, localResults);
      return localResults;
    }
    
    // No search query - return all threads
    // console.log(`📋 No search query - showing all threads`);
    return safeAllThreads;
  };
  
  const filteredThreads = getFilteredThreads();
  const isSearchActive = searchQuery.trim().length > 0;
  
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
  
  // Refresh threads when component mounts (API-only mode)
  useEffect(() => {
    const refreshThreads = async () => {
      try {
        const threads = await loadThreadsFromStorage();
        // Merge API threads with existing manually-managed threads
        setAllThreads(prev => {
          const mergeThreads = (apiThreads, existingThreads) => {
            const apiIds = new Set((apiThreads || []).map(t => t.id));
            
            // Keep manually-added threads that aren't in the API response
            const manualThreads = (existingThreads || []).filter(t => !apiIds.has(t.id));
            
            // Combine API threads with manual threads, prioritizing API data for matching IDs
            const combined = [...(apiThreads || []), ...manualThreads];
            
            // Remove duplicates based on ID, keeping the first occurrence (API data wins)
            const seen = new Set();
            const deduped = combined.filter(thread => {
              if (seen.has(thread.id)) {
                return false;
              }
              seen.add(thread.id);
              return true;
            });
            
            return deduped;
          };

          const safeThreads = threads || {};
          const safePrev = prev || { today: [], yesterday: [], lastWeek: [], last30Days: [] };
          
          return {
            today: mergeThreads(safeThreads.today, safePrev.today),
            yesterday: mergeThreads(safeThreads.yesterday, safePrev.yesterday),
            lastWeek: mergeThreads(safeThreads.lastWeek, safePrev.lastWeek),
            last30Days: mergeThreads(safeThreads.last30Days, safePrev.last30Days)
          };
        });
        // Auto-select the first available conversation on refresh if none is active
        try {
          const activeThread = activeThreadRef.current;
          if (!activeThread || !activeThread.id) {
            // Check if we should prevent auto-thread selection (e.g., after new chat creation)
            if (window.__preventAutoThreadSelect) {
              console.log('🚫 MenuSidebar: Prevented auto-thread selection on refresh due to recent new chat creation');
              return;
            }
            
            const first = (threads.today && threads.today[0])
              || (threads.yesterday && threads.yesterday[0])
              || (threads.lastWeek && threads.lastWeek[0])
              || (threads.last30Days && threads.last30Days[0]);
            if (first && first.id && first.id !== activeThread?.id && onThreadSelect) {
              onThreadSelect(first);
            }
          }
        } catch (_) {}
      } catch (error) {
        console.error('Failed to refresh threads:', error);
      }
    };
    
    // Storage event listener commented out - causes unnecessary API calls after each message
    // This was fetching all conversations after every localStorage change
    // Use the cache clear API endpoint instead: DELETE /api/cache/clear/{domain_id}
    // window.addEventListener('storage', refreshThreads);
    
    // Commented out automatic refresh to prevent excessive API calls
    // const interval = setInterval(refreshThreads, 5000); // Reduced frequency for API calls
    
    return () => {
      // window.removeEventListener('storage', refreshThreads);
      // clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const entries = Array.from(pendingTitleUpdatesRef.current.entries());
    if (!entries.length) return;

    entries.forEach(([id, rawEntry]) => {
      const normalized = typeof rawEntry === 'string' ? { title: rawEntry, lastAttempt: 0 } : rawEntry;
      if (!normalized?.title) return;
      if (isPlaceholderThreadId(id)) return;

      const now = Date.now();
      const lastAttempt = normalized.lastAttempt || 0;
      const RETRY_WINDOW_MS = 4000;
      if (now - lastAttempt < RETRY_WINDOW_MS) return;

      setPendingTitleEntry(id, normalized.title, now);

      (async () => {
        try {
          const oktaUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
          const domainId = oktaUser.domainId || oktaUser.domain_id || null;
          if (!domainId) {
            console.warn('⚠️ Deferred rename retry skipped - missing domainId');
            return;
          }

          hybridChatService.setUserId(domainId);
          const result = await hybridChatService.updateConversation(id, { title: normalized.title });
          if (result && result.success === false) {
            console.warn('⚠️ Deferred rename retry reported failure:', result);
            setPendingTitleEntry(id, normalized.title, Date.now());
          } else {
            clearPendingTitleEntry(id);
            console.log('✅ Deferred rename applied successfully for conversation:', id);
          }
        } catch (retryError) {
          console.warn('⚠️ Deferred rename retry failed:', retryError);
          setPendingTitleEntry(id, normalized.title, Date.now());
        }
      })();
    });
  }, [allThreads]);
  
  // Handle thread rename
  const handleRenameThread = async (threadId, newTitle) => {
    try {
      console.log('🔄 Attempting to rename thread:', threadId, 'to:', newTitle);
      const isPlaceholder = isPlaceholderThreadId(threadId);
      
      // 1. 🚀 IMMEDIATE UI UPDATE - Update the title in the current threads state immediately
      setAllThreads(prevThreads => {
        const updateThreadsInCategory = (threads) => {
          return threads.map(thread => 
            thread.id === threadId ? { ...thread, title: newTitle } : thread
          );
        };

        return {
          today: updateThreadsInCategory(prevThreads.today || []),
          yesterday: updateThreadsInCategory(prevThreads.yesterday || []),
          lastWeek: updateThreadsInCategory(prevThreads.lastWeek || []),
          last30Days: updateThreadsInCategory(prevThreads.last30Days || [])
        };
      });

      // 2. 💾 UPDATE LOCAL STORAGE - Update immediately regardless of API response
      try {
        localConversationManager.updateConversationTitle(threadId, newTitle);
        console.log('✅ Local storage updated with new title:', newTitle);
      } catch (localError) {
        console.error('❌ Failed to update local storage:', localError);
        // Continue even if local storage fails
      }

      // 2.5. 📱 UPDATE CURRENT THREAD - If user is viewing this conversation, update ChatPage too
      if (currentActiveThread && currentActiveThread.id === threadId && onThreadUpdate) {
        const updatedThread = { 
          ...currentActiveThread, 
          title: newTitle 
        };
        onThreadUpdate(updatedThread);
        console.log('✅ Current thread title updated in ChatPage:', newTitle);
      }

      if (isPlaceholder) {
        setPendingTitleEntry(threadId, newTitle);
        console.log('📝 Stored pending title update for placeholder thread:', threadId);
      } else {
        clearPendingTitleEntry(threadId);
      }

      // 3. 🌐 BACKGROUND API CALL - Update backend without blocking UI
      if (!isPlaceholder) {
        try {
          const oktaUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
          const domainId = oktaUser.domainId || oktaUser.domain_id || null;
          if (!domainId) {
            console.warn('⚠️ No domainId; skip backend rename update');
            setPendingTitleEntry(threadId, newTitle, Date.now());
          } else {
            hybridChatService.setUserId(domainId);

            const result = await hybridChatService.updateConversation(threadId, { 
              title: newTitle 
            });
            
            if (result && result.success !== false) {
              console.log('✅ Backend API updated with new title:', newTitle);
              clearPendingTitleEntry(threadId);
            } else {
              console.warn('⚠️ Backend API update failed, but UI and local storage already updated:', result);
              setPendingTitleEntry(threadId, newTitle, Date.now());
            }
          }
        } catch (apiError) {
          console.error('❌ Backend API update failed, but UI and local storage already updated:', apiError);
          setPendingTitleEntry(threadId, newTitle, Date.now());
          // Don't show error to user since UI is already updated
        }
      }
      
    } catch (error) {
      console.error('❌ Error in rename operation:', error);
      
      // If there's a critical error, revert UI by refreshing from storage
      try {
        const threads = await loadThreadsFromStorage();
        setAllThreads(threads);
        console.log('🔄 Reverted UI due to critical error');
      } catch (revertError) {
        console.error('❌ Failed to revert UI:', revertError);
      }
    }
    
    // Clear editing state
    setEditingThreadId(null);
    setEditingTitle('');
  };
  
  // Handle thread delete
  const handleDeleteThread = async (threadId) => {
    try {
      console.log('🗑️ Attempting to delete thread:', threadId);
      
      // Get user info for the API call
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const userId = userInfo.domainId || userInfo.domain_id;
      
      if (userId) {
        hybridChatService.setUserId(userId);
      }
      
      // Prepare remaining thread list BEFORE state update for fallback selection
      const remainingThreadsFlat = [
        ...(Array.isArray(allThreads.today) ? allThreads.today : []),
        ...(Array.isArray(allThreads.yesterday) ? allThreads.yesterday : []),
        ...(Array.isArray(allThreads.lastWeek) ? allThreads.lastWeek : []),
        ...(Array.isArray(allThreads.last30Days) ? allThreads.last30Days : [])
      ].filter(t => t && t.id !== threadId);

      // Remove from local state immediately - ALWAYS delete from frontend
      setAllThreads(prevThreads => {
        if (!prevThreads || typeof prevThreads !== 'object') {
          console.warn('⚠️ prevThreads is not an object:', prevThreads);
          return { today: [], yesterday: [], lastWeek: [], last30Days: [] };
        }
        return {
          today: Array.isArray(prevThreads.today) ? prevThreads.today.filter(thread => thread.id !== threadId) : [],
          yesterday: Array.isArray(prevThreads.yesterday) ? prevThreads.yesterday.filter(thread => thread.id !== threadId) : [],
          lastWeek: Array.isArray(prevThreads.lastWeek) ? prevThreads.lastWeek.filter(thread => thread.id !== threadId) : [],
          last30Days: Array.isArray(prevThreads.last30Days) ? prevThreads.last30Days.filter(thread => thread.id !== threadId) : []
        };
      });
      console.log('✅ Thread removed from frontend UI permanently:', threadId);

      try {
        localConversationManager.deleteConversation(threadId);
      } catch (localDeleteError) {
        console.warn('⚠️ Failed to remove conversation from local storage:', localDeleteError);
      }

      // If the deleted thread was the active one, choose fallback
      if (currentActiveThread && currentActiveThread.id === threadId) {
        try { hybridChatService.clearActiveConversation(); } catch {}
        if (remainingThreadsFlat.length > 0) {
          // Select the most recently created (first in today if available, else first in flat list)
          const nextThread = remainingThreadsFlat[0];
          console.log('➡️ Selecting fallback thread after delete:', nextThread.id);
          onThreadSelect && onThreadSelect(nextThread);
        } else {
          console.log('🆕 No remaining threads, starting a fresh New Chat after delete');
          onNewChat && onNewChat();
        }
      }
      
      // Call delete API and react based on result
  const deleteResult = await hybridChatService.deleteConversation(threadId);
  const backendSuccess = deleteResult ? deleteResult.backendSuccess !== false : false;

      if (backendSuccess && !deleteResult?.skippedBackend) {
        console.log('🗑️ Backend confirmed delete for:', threadId);
        console.log('✅ Delete confirmed, UI already updated - no refresh needed');
        // Don't refresh - frontend already removed the conversation from UI
        // Refreshing can cause race condition where stale cache data re-adds the deleted conversation
      } else if (!backendSuccess) {
        console.warn('⚠️ Backend delete failed; restoring conversations from server state');
        const refreshedThreads = await loadThreadsFromStorage();
        if (refreshedThreads) {
          setAllThreads(refreshedThreads);
        }
      }
      
      console.log('🔒 Skipped immediate full list refresh to prevent flicker');
      
    } catch (error) {
      console.log('⚠️ Delete operation had issues but frontend deletion completed:', error.message);
      // Still ensure the thread is removed from UI even if there were errors
      setAllThreads(prevThreads => {
        if (!prevThreads || typeof prevThreads !== 'object') {
          return {
            today: [],
            yesterday: [],
            lastWeek: [],
            last30Days: []
          };
        }
        
        return {
          today: Array.isArray(prevThreads.today) ? prevThreads.today.filter(thread => thread.id !== threadId) : [],
          yesterday: Array.isArray(prevThreads.yesterday) ? prevThreads.yesterday.filter(thread => thread.id !== threadId) : [],
          lastWeek: Array.isArray(prevThreads.lastWeek) ? prevThreads.lastWeek.filter(thread => thread.id !== threadId) : [],
          last30Days: Array.isArray(prevThreads.last30Days) ? prevThreads.last30Days.filter(thread => thread.id !== threadId) : []
        };
      });
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
            {/* Back Button */}
            <button 
              className="flex items-center gap-3 flex-1"
              onClick={onBack}
            >
              <ArrowLeft className="w-6 h-6" style={{ color: isDarkMode ? '#FFF' : '#2861BB' }} />
              <span style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '14px', fontWeight: 500, lineHeight: '150%' }}>
                Back
              </span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => {
                setIsDarkModeLocal(!isDarkModeLocal);
                if (onToggleTheme) onToggleTheme();
              }}
              className="relative w-12 h-6 rounded-full border flex items-center transition-all"
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

        {/* Back button - Shown only when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center">
            <button onClick={onBack} className="p-2 hover:opacity-70">
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
            {isSearching && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}
            {searchQuery && !isSearching && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                }}
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
            {!isSearchActive && (
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
              {agent.type === 'jira' && (
                <img
                  src={`${process.env.PUBLIC_URL}/icons/agent_jira.png`}
                  alt="Jira Agent"
                  className="w-7 h-7 rounded"
                  style={{ objectFit: 'contain' }}
                />
              )}
              {agent.type === 'servicenow' && (
                <img
                  src={`${process.env.PUBLIC_URL}/icons/agent_servicenow.png`}
                  alt="ServiceNow Agent"
                  className="w-7 h-7 rounded"
                  style={{ objectFit: 'contain' }}
                />
              )}

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
          {!isSearchActive && (
            <div className="w-full h-px" style={{ backgroundColor: isDarkMode ? '#444' : '#CCC' }} />
          )}

          {/* Previous Threads Header */}
          <div className="flex items-center gap-2.5 w-full px-2">
            <div className="flex-1 text-left" style={{ color: isDarkMode ? '#FFF' : '#2861BB', fontSize: '14px', fontWeight: 600, lineHeight: '16px' }}>
              {isSearchActive ? `Search Results` : 'Previous Threads'}
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
                  {filteredThreads.today.map((thread) => (
                    <div 
                      key={thread.id || thread.title}
                      className={`flex items-center gap-2 w-full p-2 rounded transition-colors group ${
                        currentActiveThread?.id === thread.id 
                          ? (isDarkMode ? 'bg-[#2861BB]' : 'bg-blue-100') 
                          : (isDarkMode ? 'hover:bg-[#1F3E81]' : 'hover:bg-gray-50')
                      }`}
                      ref={(el) => {
                        if (!thread?.id) return;
                        if (el) threadItemRefs.current.set(thread.id, el);
                        else threadItemRefs.current.delete(thread.id);
                      }}
                      style={{ scrollMarginTop: '64px' }}
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
                  {filteredThreads.yesterday.map((thread) => (
                    <div 
                      key={thread.id || thread.title}
                      className={`flex items-center gap-2 w-full p-2 rounded transition-colors group ${
                        currentActiveThread?.id === thread.id 
                          ? (isDarkMode ? 'bg-[#2861BB]' : 'bg-blue-100') 
                          : (isDarkMode ? 'hover:bg-[#1F3E81]' : 'hover:bg-gray-50')
                      }`}
                      ref={(el) => {
                        if (!thread?.id) return;
                        if (el) threadItemRefs.current.set(thread.id, el);
                        else threadItemRefs.current.delete(thread.id);
                      }}
                      style={{ scrollMarginTop: '64px' }}
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
                {filteredThreads.lastWeek.map((thread) => (
                  <div 
                    key={thread.id || thread.title}
                    className={`flex items-center gap-2 w-full p-2 rounded transition-colors group ${
                      currentActiveThread?.id === thread.id 
                        ? (isDarkMode ? 'bg-[#2861BB]' : 'bg-blue-100') 
                        : (isDarkMode ? 'hover:bg-[#1F3E81]' : 'hover:bg-gray-50')
                    }`}
                    ref={(el) => {
                      if (!thread?.id) return;
                      if (el) threadItemRefs.current.set(thread.id, el);
                      else threadItemRefs.current.delete(thread.id);
                    }}
                    style={{ scrollMarginTop: '64px' }}
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
                {filteredThreads.last30Days.map((thread) => (
                  <div 
                    key={thread.id || thread.title}
                    className={`flex items-center gap-2 w-full p-2 rounded transition-colors group ${
                      currentActiveThread?.id === thread.id 
                        ? (isDarkMode ? 'bg-[#2861BB]' : 'bg-blue-100') 
                        : (isDarkMode ? 'hover:bg-[#1F3E81]' : 'hover:bg-gray-50')
                    }`}
                    ref={(el) => {
                      if (!thread?.id) return;
                      if (el) threadItemRefs.current.set(thread.id, el);
                      else threadItemRefs.current.delete(thread.id);
                    }}
                    style={{ scrollMarginTop: '64px' }}
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
        {isSearchActive && filteredThreads.today.length === 0 && filteredThreads.yesterday.length === 0 && filteredThreads.lastWeek.length === 0 && filteredThreads.last30Days.length === 0 && (
          <div className="text-center py-8">
            <div className="text-sm" style={{ color: isDarkMode ? '#FFF' : '#949494' }}>
              No threads found matching "{searchQuery}"
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
              }}
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
          onClick={() => {
            if (isNewChatDisabled) {
              console.warn('New Chat is disabled while a question is being processed.');
              return;
            }
            onNewChat && onNewChat();
          }}
          disabled={isNewChatActive || isNewChatDisabled}
          className={`flex items-center justify-center gap-1 transition-colors ${
            isCollapsed ? 'w-10 h-10 rounded' : 'w-full h-10 rounded'
          } ${
            (isNewChatActive || isNewChatDisabled)
              ? 'bg-gray-300 cursor-not-allowed'
              : (isDarkMode ? 'bg-white hover:bg-gray-100' : 'bg-[#2861BB] hover:bg-[#1f4a9c]')
          }`}
        >
          <Plus 
            className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} 
            style={{ 
              color: isCollapsed 
                ? (isDarkMode ? '#2861BB' : '#FFF')
                : ((isNewChatActive || isNewChatDisabled) ? '#999' : (isDarkMode ? '#2861BB' : '#FFF'))
            }} 
          />
          {!isCollapsed && (
            <span style={{ color: (isNewChatActive || isNewChatDisabled) ? '#999' : (isDarkMode ? '#2861BB' : '#FFF'), fontSize: '14px', fontWeight: 600 }}>
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
