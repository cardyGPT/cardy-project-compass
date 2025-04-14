
import { useState, useEffect, useCallback } from 'react';
import { JiraTicket } from '@/types/jira';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface JiraArtifacts {
  lldContent: string | null;
  codeContent: string | null;
  testContent: string | null;
  isLldGenerated: boolean;
  isCodeGenerated: boolean;
  isTestsGenerated: boolean;
}

export const useJiraArtifacts = (ticket: JiraTicket | null) => {
  const [artifacts, setArtifacts] = useState<JiraArtifacts>({
    lldContent: null,
    codeContent: null,
    testContent: null,
    isLldGenerated: false,
    isCodeGenerated: false,
    isTestsGenerated: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchArtifacts = useCallback(async () => {
    if (!ticket?.key) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching artifacts for ticket: ${ticket.key}`);
      
      const { data, error } = await supabase
        .from('story_artifacts')
        .select('*')
        .eq('story_id', ticket.key)
        .maybeSingle();

      if (error) {
        console.error('Error fetching artifacts:', error);
        setError(error.message);
        return;
      }

      if (data) {
        console.log('Artifacts found:', data);
        
        setArtifacts({
          lldContent: data.lld_content || null,
          codeContent: data.code_content || null,
          testContent: data.test_content || null,
          isLldGenerated: Boolean(data.lld_content),
          isCodeGenerated: Boolean(data.code_content),
          isTestsGenerated: Boolean(data.test_content)
        });
      } else {
        console.log('No artifacts found for this ticket');
        // Reset if no data found
        setArtifacts({
          lldContent: null,
          codeContent: null,
          testContent: null,
          isLldGenerated: false,
          isCodeGenerated: false,
          isTestsGenerated: false
        });
      }
    } catch (err) {
      console.error('Error fetching artifacts:', err);
      if (err instanceof Error) {
        setError(err.message);
        toast({
          title: 'Error',
          description: `Failed to load content: ${err.message}`,
          variant: 'destructive'
        });
      } else {
        setError('Unknown error occurred while fetching artifacts');
        toast({
          title: 'Error',
          description: 'Unknown error occurred while loading content',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  }, [ticket, toast]);

  // Fetch artifacts whenever ticket changes
  useEffect(() => {
    if (ticket?.key) {
      fetchArtifacts();
    }
  }, [fetchArtifacts, ticket]);

  return {
    ...artifacts,
    loading,
    error,
    refreshArtifacts: fetchArtifacts
  };
};
