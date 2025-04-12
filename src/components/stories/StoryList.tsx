
import React, { useEffect } from "react";
import { useStories } from "@/contexts/StoriesContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const StoryList: React.FC = () => {
  const { tickets, loading, error, fetchTickets, setSelectedTicket, selectedTicket, selectedSprint } = useStories();

  // Create a proper click handler that doesn't pass parameters
  const handleRefreshClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    fetchTickets();
  };

  // Create a proper retry handler
  const handleRetryClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    fetchTickets();
  };

  // Helper function to safely convert content to string
  const safeGetContent = (content: any): string => {
    if (content === null || content === undefined) {
      return "";
    }
    
    if (typeof content === 'string') {
      return content;
    }
    
    // Handle specific Jira document format
    if (content && typeof content === 'object' && 
        'type' in content && 'version' in content && 'content' in content) {
      try {
        return JSON.stringify(content, null, 2);
      } catch (e) {
        console.error("Error parsing Jira content object:", e);
        return "[Content formatting error]";
      }
    }
    
    if (typeof content === 'object') {
      try {
        return JSON.stringify(content);
      } catch (e) {
        console.error("Error stringifying content:", e);
        return "[Content format error]";
      }
    }
    
    return String(content || "");
  };

  // When loading and no tickets, show skeleton
  if (loading && tickets.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Jira Tickets</h2>
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        
        {[1, 2, 3].map((i) => (
          <Card key={i} className="cursor-pointer hover:border-primary/50">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-6 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mt-2" />
            </CardContent>
            <CardFooter className="pt-2 flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  // When error, show error card
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Jira Tickets</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetryClick} 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
        
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Tickets
            </CardTitle>
            <CardDescription>{safeGetContent(error)}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleRetryClick}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Jira Tickets</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefreshClick} 
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      
      {tickets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              No Tickets Found
            </CardTitle>
            <CardDescription>
              {selectedSprint 
                ? `No Jira tickets were found for the sprint "${safeGetContent(selectedSprint.name)}".`
                : "No sprint selected. Please select a sprint to view tickets."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-muted">
              <AlertTitle>Suggestions:</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2 text-sm">
                  <li>Check if the sprint contains any issues in Jira</li>
                  <li>Verify your Jira connection settings</li>
                  <li>Try selecting a different sprint</li>
                  <li>You may need additional permissions to view these tickets</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card 
              key={ticket.id}
              className={`cursor-pointer hover:border-primary/50 transition-colors ${selectedTicket?.id === ticket.id ? 'border-primary' : ''}`}
              onClick={() => setSelectedTicket(ticket)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{safeGetContent(ticket.key)}</Badge>
                    <Badge 
                      variant={
                        safeGetContent(ticket.status) === 'To Do' ? 'secondary' :
                        safeGetContent(ticket.status) === 'In Progress' ? 'default' :
                        safeGetContent(ticket.status) === 'Done' ? 'secondary' : 
                        'outline'
                      }
                    >
                      {safeGetContent(ticket.status)}
                    </Badge>
                  </div>
                  <Badge 
                    variant={
                      safeGetContent(ticket.priority) === 'High' ? 'destructive' :
                      safeGetContent(ticket.priority) === 'Medium' ? 'default' :
                      'secondary'
                    }
                  >
                    {safeGetContent(ticket.priority) || 'No Priority'}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{safeGetContent(ticket.summary)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 line-clamp-2">{safeGetContent(ticket.description) || 'No description provided'}</p>
                {ticket.labels && ticket.labels.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {ticket.labels.map((label) => (
                      <Badge key={safeGetContent(label)} variant="outline" className="text-xs">
                        {safeGetContent(label)}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 flex justify-between text-xs text-gray-500">
                <div>Assignee: {safeGetContent(ticket.assignee) || 'Unassigned'}</div>
                {ticket.updated_at && (
                  <div className="flex items-center">
                    Updated: {format(new Date(ticket.updated_at), 'MMM d, yyyy')}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Fix the URL format to prevent double domain
                        const cleanDomain = ticket.domain ? ticket.domain.replace(/^https?:\/\//i, '') : '';
                        window.open(`https://${cleanDomain}/browse/${safeGetContent(ticket.key)}`, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoryList;
