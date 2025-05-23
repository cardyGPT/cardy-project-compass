
import { ContentType } from "../ContentDisplay";
import { JiraGenerationResponse } from "@/types/jira";

export const GENERATION_STEPS = [
  { id: 'select', title: 'Select', subtitle: 'Choose ticket' },
  { id: 'lld', title: 'LLD', subtitle: 'Low-Level Design' },
  { id: 'code', title: 'Code', subtitle: 'Implementation' },
  { id: 'tests', title: 'Tests', subtitle: 'Unit Tests' },
  { id: 'testcases', title: 'Test Cases', subtitle: 'Manual Tests' },
  { id: 'testScripts', title: 'Test Scripts', subtitle: 'Playwright/JMeter' }
];

export const getContentByType = (content: JiraGenerationResponse | null, type: ContentType): string | null => {
  if (!content) return null;

  switch (type) {
    case 'lld': return content.lldContent || null;
    case 'code': return content.codeContent || null;
    case 'tests': return content.testContent || null;
    case 'testcases': return content.testCasesContent || null;
    case 'testScripts': return content.testScriptsContent || null;
    default: return null;
  }
};

export const getNextStepId = (currentStep: string): string | null => {
  const currentIndex = GENERATION_STEPS.findIndex(step => step.id === currentStep);
  if (currentIndex < 0 || currentIndex >= GENERATION_STEPS.length - 1) return null;
  return GENERATION_STEPS[currentIndex + 1].id;
};

export const getPreviousStepId = (currentStep: string): string | null => {
  const currentIndex = GENERATION_STEPS.findIndex(step => step.id === currentStep);
  if (currentIndex <= 0) return null;
  return GENERATION_STEPS[currentIndex - 1].id;
};

export const isStepCompleted = (content: JiraGenerationResponse | null, stepId: string): boolean => {
  if (!content) return false;
  
  switch (stepId) {
    case 'select': return true; // Select step is always considered completed if we have a ticket
    case 'lld': return !!content.lldContent;
    case 'code': return !!content.codeContent;
    case 'tests': return !!content.testContent;
    case 'testcases': return !!content.testCasesContent;
    case 'testScripts': return !!content.testScriptsContent;
    default: return false;
  }
};

export const getStatusMessage = (type: ContentType): string => {
  switch (type) {
    case 'lld':
      return 'Generating Low-Level Design...\n\nThis will create a detailed technical specification including system components, data models, and interactions.';
    case 'code':
      return 'Generating Implementation Code...\n\nCreating code based on the Low-Level Design specifications.';
    case 'tests':
      return 'Generating Unit Tests...\n\nCreating Jest/Jasmine tests for the implementation code.';
    case 'testcases':
      return 'Generating Test Cases...\n\nCreating comprehensive test scenarios to validate functionality.';
    case 'testScripts':
      return 'Generating Test Scripts...\n\nCreating automated test scripts using Playwright/JMeter.';
    default:
      return 'Generating content...';
  }
};

// Document format related utilities
export const generateFormattedDocument = (content: string, contentType: ContentType, ticket: any, author: string): string => {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const documentTitle = contentType === 'lld' ? 'Low-Level Design Document' :
                        contentType === 'code' ? 'Implementation Code' :
                        contentType === 'tests' ? 'Unit Tests Documentation' :
                        contentType === 'testcases' ? 'Test Cases Document' : 
                        'Test Scripts Documentation';
  
  return `# ${documentTitle}
  
## Document Information

**Document Title:** ${documentTitle} for ${ticket.key} - ${ticket.summary}
**Version:** 1.0
**Date:** ${date}
**Generated By:** ${author || 'AI Assistant'}
**Project:** ${ticket.projectId || 'Unknown'}

---

## Table of Contents
1. [Introduction](#introduction)
2. [Purpose](#purpose)
3. [Scope](#scope)
4. [Related Documents](#related-documents)
5. [Content](#content)
6. [Revision History](#revision-history)

---

## Introduction
This document contains ${documentTitle.toLowerCase()} for the ticket: ${ticket.key} - ${ticket.summary}.

## Purpose
${
  contentType === 'lld' ? 'This document provides detailed technical specifications for implementing the required functionality.' :
  contentType === 'code' ? 'This document provides implementation code based on the Low-Level Design.' :
  contentType === 'tests' ? 'This document provides unit tests for verifying the implementation code.' :
  contentType === 'testcases' ? 'This document outlines comprehensive test cases for manual testing.' :
  'This document provides automated test scripts for testing the implementation.'
}

## Scope
This document covers all aspects related to the ${ticket.key} ticket.

## Related Documents
- Jira Ticket: ${ticket.key}
${contentType !== 'lld' ? '- Low-Level Design Document' : ''}
${contentType !== 'code' && contentType !== 'lld' ? '- Implementation Code Document' : ''}
${contentType === 'testScripts' ? '- Test Cases Document' : ''}

---

## Content

${content}

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | ${date} | ${author || 'AI Assistant'} | Initial document generation |

`;
};
