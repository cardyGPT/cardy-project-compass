
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { JiraTicket } from '@/types/jira';
import { ContentType } from '../ContentDisplay';

interface WordExportButtonProps {
  content: string;
  contentType: ContentType;
  ticket: JiraTicket;
  className?: string;
  disabled?: boolean;
}

// This component completely disables Word export functionality to prevent errors
const WordExportButton: React.FC<WordExportButtonProps> = ({
  content,
  contentType,
  ticket,
  className = '',
  disabled = false
}) => {
  const { toast } = useToast();

  // Completely disabled handleExport function with message
  const handleExport = () => {
    toast({
      title: "Export Feature Disabled",
      description: "Word export has been temporarily disabled. Please use PDF or Google Drive export instead.",
      variant: "default",
    });
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={true} // Always disabled
      className={className}
    >
      <FileText className="h-4 w-4 mr-1" />
      Word
    </Button>
  );
};

export default WordExportButton;
