/// <reference types="cypress" />

// UI Functionality Test Suite

describe('Pulse/Result Page UI Functionality', () => {
  const predefined = 'Share the latest company updates on AI developments';
  const manualQ = 'How do I access the company VPN?';

  it('1) Main page: predefined question routes to result page and shows in input; back returns to main', () => {
    cy.visit('http://localhost:3002');
    cy.contains(predefined).click();
    cy.url().should('include', '/resultpage');
    cy.get('[data-cy=chat-input]').should('have.value', predefined);
    cy.contains('Back').click();
    cy.location('pathname').should('eq', '/');
  });

  it('2) Main page: manual question routes to result page and shows response; back returns to main', () => {
    cy.visit('http://localhost:3002');
    cy.get('[data-cy=hero-input]').type(`${manualQ}{enter}`);
    cy.url().should('include', '/resultpage');
    // Input should be empty (manual flow shows messages instead)
    cy.get('[data-cy=chat-input]').should('have.value', '');
  // Verify user message and assistant response present
  cy.contains(manualQ).should('exist');
  cy.get('[data-cy=assistant-message]').should('exist');
    cy.contains('Back').click();
    cy.location('pathname').should('eq', '/');
  });

  it('3) Pulse page: predefined question routes to result page and shows in input; back returns to Pulse page', () => {
    cy.visit('http://localhost:3002/pulsemain');
    cy.contains(predefined).click();
    cy.url().should('include', '/resultpage');
    cy.get('[data-cy=chat-input]').should('have.value', predefined);
    cy.contains('Back').click();
    cy.location('pathname').should('eq', '/pulsemain');
  });

  it('4) Pulse page: manual question routes to result page and shows response; back returns to Pulse page', () => {
    cy.visit('http://localhost:3002/pulsemain');
    cy.get('[data-cy=hero-input]').type(`${manualQ}{enter}`);
    cy.url().should('include', '/resultpage');
    cy.get('[data-cy=chat-input]').should('have.value', '');
  cy.contains(manualQ).should('exist');
  cy.get('[data-cy=assistant-message]').should('exist');
    cy.contains('Back').click();
    cy.location('pathname').should('eq', '/pulsemain');
  });

  it('5) Pulse page: dropdown select of a title routes to result page and shows conversation; back returns to Pulse page', () => {
    const existingThread = {
      today: [
        {
          id: 'test-thread-1',
          title: 'How to submit sick leave in Workday?',
          conversation: [
            { type: 'user', text: 'How do I submit sick leave requests in Workday?' },
            { type: 'assistant', text: 'To submit sick leave in Workday:' }
          ]
        }
      ],
      yesterday: [], lastWeek: [], last30Days: []
    };
    cy.visit('http://localhost:3002/pulsemain', {
      onBeforeLoad(win) {
        win.localStorage.setItem('chatThreads', JSON.stringify(existingThread));
      }
    });
    // Focus input to open suggestions dropdown
  cy.get('[data-cy=hero-input]').click().type('How');
  cy.contains('Previous Conversations');
    cy.contains('How to submit sick leave in Workday?').click();
    cy.url().should('include', '/resultpage');
    cy.contains('How do I submit sick leave requests in Workday?').should('exist');
    cy.contains('To submit sick leave in Workday:').should('exist');
    cy.contains('Back').click();
    cy.location('pathname').should('eq', '/pulsemain');
  });

  it('6) Main page: dropdown select of a title routes to result page and shows conversation', () => {
    const existingThread = {
      today: [
        {
          id: 'test-thread-2',
          title: 'Understanding our compensation review cycle',
          conversation: [
            { type: 'user', text: 'When does our compensation review happen and how does it work?' },
            { type: 'assistant', text: 'Our compensation review occurs annually in March.' }
          ]
        }
      ],
      yesterday: [], lastWeek: [], last30Days: []
    };
    cy.visit('http://localhost:3002', {
      onBeforeLoad(win) {
        win.localStorage.setItem('chatThreads', JSON.stringify(existingThread));
      }
    });
  cy.get('[data-cy=hero-input]').click().type('Understand');
  cy.contains('Previous Conversations');
    cy.contains('Understanding our compensation review cycle').click();
    cy.url().should('include', '/resultpage');
    cy.contains('When does our compensation review happen and how does it work?').should('exist');
    cy.contains('Our compensation review occurs annually in March.').should('exist');
  });
});
