
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { JiraCredentials, JiraProject, JiraSprint, JiraTicket } from '@/types/jira';
import { fetchJiraTickets } from '../api';

export const useTickets = (
  credentials: JiraCredentials | null,
  selectedProject: JiraProject | null,
  setError: (error: string | null) => void
) => {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<JiraTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<JiraTicket | null>(null);
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string | null>(null);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTickets = async (sprintId?: string) => {
    if (!credentials) {
      setError('No Jira credentials provided');
      return;
    }

    const sprintToUse = sprintId || null;

    if (!sprintToUse) {
      setError('No sprint selected');
      return;
    }

    if (!selectedProject) {
      setError('No project selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching tickets for sprint ID: ${sprintToUse} in project ID: ${selectedProject.id}`);
      const result = await fetchJiraTickets(
        credentials, 
        sprintToUse, 
        selectedProject, 
        0, 
        50, 
        { 
          type: ticketTypeFilter, 
          status: ticketStatusFilter 
        }
      );
      
      console.log(`Found ${result.tickets.length} tickets for sprint ID: ${sprintToUse}`);
      setTickets(result.tickets);
    } catch (err: any) {
      console.error('Error fetching Jira tickets:', err);
      setError(err.message || 'Failed to fetch Jira tickets');
      toast({
        title: "Error",
        description: err.message || 'Failed to fetch Jira tickets',
        variant: "destructive",
      });
      // Ensure tickets is at least an empty array on error
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    tickets,
    selectedTicket,
    setSelectedTicket,
    fetchTickets,
    ticketTypeFilter,
    setTicketTypeFilter,
    ticketStatusFilter,
    setTicketStatusFilter
  };
};
