
import { JiraCredentials, JiraProject, JiraTicket } from '@/types/jira';
import { callJiraApi, DEV_MODE } from './apiUtils';

export const fetchJiraTickets = async (
  credentials: JiraCredentials, 
  sprintId: string | number,
  selectedProject: JiraProject | null,
  startAt: number = 0,
  maxResults: number = 50, // Increased from 20 to 50
  filters: { type?: string | null, status?: string | null } = {}
): Promise<{ tickets: JiraTicket[], total: number }> => {
  try {
    if (!selectedProject) {
      throw new Error('No project selected');
    }
    
    console.log(`Fetching tickets for sprint ID: ${sprintId} in project ${selectedProject.key} (${selectedProject.id}), startAt: ${startAt}, maxResults: ${maxResults}, filters:`, filters);
    
    // Safely check if it's a development sprint 
    const sprintIdString = String(sprintId || '');
    if (sprintIdString.startsWith && sprintIdString.startsWith('test-')) {
      if (DEV_MODE) {
        console.log('[DEV MODE] Returning test tickets for development sprint');
        const testData = generateTestTickets(sprintIdString, selectedProject, credentials, 50);
        
        // Apply filters to test data
        let filteredTestData = [...testData];
        if (filters.type) {
          filteredTestData = filteredTestData.filter(ticket => 
            ticket.issuetype?.name?.toLowerCase() === filters.type?.toLowerCase()
          );
        }
        if (filters.status) {
          filteredTestData = filteredTestData.filter(ticket => 
            ticket.status?.toLowerCase() === filters.status?.toLowerCase()
          );
        }
        
        return { 
          tickets: filteredTestData.slice(startAt, startAt + maxResults), 
          total: filteredTestData.length 
        };
      }
    }
    
    // Build JQL query with filters
    let jqlQuery = `sprint = ${sprintId}`;
    
    // Add type filter
    if (filters.type) {
      jqlQuery += ` AND issuetype = "${filters.type}"`;
    }
    
    // Add status filter
    if (filters.status) {
      jqlQuery += ` AND status = "${filters.status}"`;
    }
    
    // Add sorting
    jqlQuery += ` ORDER BY updated DESC`;
    
    // Regular API call for all sprints
    console.log(`Fetching tickets with JQL: ${jqlQuery}`);
    const data = await callJiraApi(credentials, `search?jql=${encodeURIComponent(jqlQuery)}&maxResults=${maxResults}&startAt=${startAt}`);
    
    // Ensure data.issues is always an array to prevent the map error
    if (!data.issues) {
      console.log('No issues found in sprint, returning empty issues array');
      return { tickets: [], total: 0 };
    }
    
    // Transform the response into our JiraTicket format
    const tickets = data.issues.map((issue: any) => transformJiraIssue(issue, credentials, selectedProject, String(sprintId)));
    
    return { tickets, total: data.total || tickets.length };
  } catch (error) {
    console.error('Error fetching Jira tickets:', error);
    
    // Return test data in dev mode if there's an error
    if (DEV_MODE && selectedProject) {
      console.log('[DEV MODE] Returning test tickets due to error');
      const testData = generateTestTickets(String(sprintId), selectedProject, credentials, 50);
      return { tickets: testData, total: testData.length };
    }
    
    throw error;
  }
};

export const fetchJiraTicketsByProject = async (
  credentials: JiraCredentials,
  selectedProject: JiraProject | null,
  startAt: number = 0,
  maxResults: number = 50,
  filters: { type?: string | null, status?: string | null } = {}
): Promise<{ tickets: JiraTicket[], total: number }> => {
  try {
    if (!selectedProject) {
      throw new Error('No project selected');
    }
    
    console.log(`Fetching tickets directly for project ${selectedProject.key} (${selectedProject.id}), startAt: ${startAt}, maxResults: ${maxResults}, filters:`, filters);
    
    // Create a JQL query that fetches recent tickets from the project with filters
    let jqlQuery = `project = ${selectedProject.id}`;
    
    // Add type filter
    if (filters.type) {
      jqlQuery += ` AND issuetype = "${filters.type}"`;
    }
    
    // Add status filter
    if (filters.status) {
      jqlQuery += ` AND status = "${filters.status}"`;
    }
    
    // Add sorting
    jqlQuery += ` ORDER BY created DESC`;
    
    const data = await callJiraApi(credentials, `search?jql=${encodeURIComponent(jqlQuery)}&maxResults=${maxResults}&startAt=${startAt}`);
    
    if (!data.issues || !Array.isArray(data.issues)) {
      console.log('No issues found in project, returning empty issues array');
      return { tickets: [], total: 0 };
    }
    
    console.log(`Found ${data.issues.length} issues in project ${selectedProject.key}`);
    
    // Transform the response into our JiraTicket format
    const tickets = data.issues.map((issue: any) => transformJiraIssue(issue, credentials, selectedProject));
    
    return { tickets, total: data.total || tickets.length };
  } catch (error) {
    console.error('Error fetching Jira tickets by project:', error);
    
    // Return test data in dev mode if there's an error
    if (DEV_MODE && selectedProject) {
      console.log('[DEV MODE] Returning test tickets for project due to error');
      const testData = generateTestTickets(`project-${selectedProject.id}`, selectedProject, credentials, 50);
      return { tickets: testData, total: testData.length };
    }
    
    throw error;
  }
};

const transformJiraIssue = (issue: any, credentials: JiraCredentials, project: JiraProject, sprintId?: string): JiraTicket => {
  const fields = issue.fields || {};
  
  // Extract sprint information if available and no sprintId was passed
  let extractedSprintId = sprintId;
  if (!extractedSprintId && fields.sprint) {
    extractedSprintId = fields.sprint.id;
  }
  
  // Extract story points from custom fields (varies by Jira instance)
  let storyPoints = fields.customfield_10026;
  
  // Try alternative fields for story points if the first one is undefined
  if (storyPoints === undefined) {
    // Common custom field IDs for story points
    const storyPointFields = ['customfield_10002', 'customfield_10004', 'customfield_10005'];
    for (const field of storyPointFields) {
      if (fields[field] !== undefined) {
        storyPoints = fields[field];
        break;
      }
    }
  }
  
  // Extract acceptance criteria (commonly stored in different custom fields)
  let acceptanceCriteria = fields.customfield_10016;
  if (acceptanceCriteria === undefined) {
    // Common custom field IDs for acceptance criteria
    const acceptanceCriteriaFields = ['customfield_10012', 'customfield_10015', 'customfield_10020'];
    for (const field of acceptanceCriteriaFields) {
      if (fields[field] !== undefined) {
        acceptanceCriteria = fields[field];
        break;
      }
    }
  }
  
  return {
    id: issue.id,
    key: issue.key,
    summary: fields.summary || '',
    description: fields.description || '',
    acceptance_criteria: acceptanceCriteria || '',
    status: fields.status?.name || '',
    assignee: fields.assignee?.displayName || '',
    priority: fields.priority?.name || '',
    story_points: storyPoints || 0,
    labels: fields.labels || [],
    epic: fields.epic?.name || '',
    created_at: fields.created,
    updated_at: fields.updated,
    domain: credentials.domain,
    projectId: project.id,
    sprintId: extractedSprintId,
    issuetype: fields.issuetype ? {
      id: fields.issuetype.id,
      name: fields.issuetype.name
    } : undefined
  };
};

// Generate 50 test tickets instead of 20
const generateTestTickets = (
  sprintId: string, 
  project: JiraProject, 
  credentials: JiraCredentials, 
  count: number
): JiraTicket[] => {
  const types = ['Story', 'Bug', 'Task', 'Sub-task', 'Epic'];
  const statuses = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'];
  
  return Array.from({ length: count }).map((_, index) => ({
    id: `test-${sprintId}-${index}`,
    key: `${project.key}-${100 + index}`,
    summary: `Test ${types[index % types.length]}: ${['Implement feature', 'Fix bug', 'Update documentation', 'Refactor code', 'Design UI'][index % 5]} ${index}`,
    description: `This is a test ${types[index % types.length].toLowerCase()} for development and testing purposes.`,
    acceptance_criteria: 'When X then Y should happen',
    status: statuses[index % statuses.length],
    assignee: ['John Doe', 'Jane Smith', 'Alex Johnson', 'Sam Wilson', 'Taylor Moore'][index % 5],
    priority: ['Highest', 'High', 'Medium', 'Low', 'Lowest'][index % 5],
    story_points: [1, 2, 3, 5, 8, 13][index % 6],
    labels: ['frontend', 'backend', 'api', 'ui', 'database', 'security'][index % 6].split(','),
    domain: credentials.domain,
    projectId: project.id,
    sprintId,
    issuetype: {
      id: `1000${index % 5 + 1}`,
      name: types[index % types.length]
    }
  }));
};
