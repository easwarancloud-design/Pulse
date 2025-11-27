/**
 * Title Generation Service
 * Handles conversation title generation via API
 */

const TITLE_API_URL = 'https://workforceagent.elevancehealth.com/api/generate_title';

/**
 * Generate a conversation title from the user's question using API
 * Falls back to first 50 characters if API fails
 * 
 * @param {string} userQuery - The user's first question
 * @param {string} domainId - The domain ID (default: 'AG04333')
 * @returns {Promise<string>} - Generated title or fallback title
 */
export async function generateConversationTitle(userQuery, domainId = 'AG04333') {
  // Fallback title (first 50 chars)
  const fallbackTitle = userQuery.length > 50 
    ? userQuery.substring(0, 50) + '...' 
    : userQuery;

  try {
    console.log('🎯 Generating title via API for query:', userQuery.substring(0, 100));
    
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
      "domainid": domainId,
      "user_query": userQuery
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow"
    };

    const response = await fetch(TITLE_API_URL, requestOptions);
    
    if (!response.ok) {
      console.warn(`⚠️ Title API returned status ${response.status}, using fallback title`);
      return fallbackTitle;
    }

    const result = await response.text();
    
    // Parse the result (assuming it returns JSON with a title field)
    // Adjust this based on the actual API response format
    let generatedTitle;
    try {
      const jsonResult = JSON.parse(result);
      generatedTitle = jsonResult.title || jsonResult.generated_title || result;
    } catch (e) {
      // If response is plain text, use it directly
      generatedTitle = result;
    }

    // Validate the generated title
    if (generatedTitle && generatedTitle.trim().length > 0) {
      console.log('✅ Successfully generated title via API:', generatedTitle);
      return generatedTitle.trim();
    } else {
      console.warn('⚠️ API returned empty title, using fallback');
      return fallbackTitle;
    }

  } catch (error) {
    console.error('❌ Failed to generate title via API:', error.message);
    console.log('🔄 Using fallback title (first 50 chars)');
    return fallbackTitle;
  }
}

/**
 * Generate title synchronously (fallback only - no API call)
 * Used when you need immediate title without waiting for API
 * 
 * @param {string} userQuery - The user's first question
 * @returns {string} - Title (first 50 chars)
 */
export function generateFallbackTitle(userQuery) {
  return userQuery.length > 50 
    ? userQuery.substring(0, 50) + '...' 
    : userQuery;
}
