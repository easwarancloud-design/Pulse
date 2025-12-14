/**
 * Predefined Questions Service
 * Handles fetching predefined questions from the API
 */

import { API_ENDPOINTS, API_HEADERS } from '../config/api';

/**
 * Fetch predefined questions for a given domain ID
 * @param {string} domainId - The domain ID (required)
 * @returns {Promise<string[]>} - Array of predefined questions
 */
export const fetchPredefinedQuestions = async (domainId) => {
  if (!domainId) {
    console.warn('⚠️ fetchPredefinedQuestions called without domainId; returning empty list');
    return [];
  }
  try {
    const upperDomain = String(domainId).toUpperCase();
    const response = await fetch(API_ENDPOINTS.PREDEFINED_QUESTIONS, {
      method: 'POST',
      headers: API_HEADERS.TOKEN_AUTH,
      body: JSON.stringify({
        domainid: upperDomain
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract questions array from response
    // Response format: { role: "Associate", questions: [...] }
    if (data && Array.isArray(data.questions)) {
      return data.questions;
    }
    
    // Fallback to empty array if format is unexpected
    console.warn('Unexpected predefined questions response format:', data);
    return [];
    
  } catch (error) {
    console.error('Error fetching predefined questions:', error);
    // Return empty array on error - component will use fallback
    return [];
  }
};

const predefinedQuestionsService = {
  fetchPredefinedQuestions
};

export default predefinedQuestionsService;
