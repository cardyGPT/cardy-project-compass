
import React, { useState, useEffect } from "react";
import { useStories } from "@/contexts/StoriesContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { JiraCredentials } from "@/types/jira";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Save, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const JiraLogin: React.FC = () => {
  const { credentials, setCredentials } = useStories();
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  // Initialize form with existing credentials
  useEffect(() => {
    if (credentials) {
      setDomain(credentials.domain || "");
      setEmail(credentials.email || "");
      setApiToken(credentials.apiToken || "");
      setIsConnected(true);
    }
  }, [credentials]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);
    
    try {
      // Clean up domain to prevent double https:// issues
      const cleanDomain = domain.trim()
        .replace(/^https?:\/\//i, '') // Remove any existing http:// or https://
        .replace(/\/+$/, ''); // Remove trailing slashes
      
      if (!cleanDomain || !email.trim() || !apiToken.trim()) {
        throw new Error("All fields are required");
      }
      
      // Create credentials object
      const credentials: JiraCredentials = {
        domain: cleanDomain,
        email: email.trim(),
        apiToken: apiToken.trim()
      };
      
      console.log("Testing Jira connection with credentials:", { domain: credentials.domain, email: credentials.email });
      
      // Validate credentials by making a test API call to get current user
      const { data, error } = await supabase.functions.invoke('jira-api', {
        body: {
          action: 'getProjects',
          domain: credentials.domain,
          email: credentials.email,
          apiToken: credentials.apiToken
        }
      });
      
      console.log("Jira API response:", data);
      
      if (error || !data || data.error) {
        console.error("Jira login error:", error || data?.error);
        throw new Error(
          error?.message || 
          data?.error || 
          data?.details?.message || 
          data?.details?.errorMessages?.join(', ') || 
          "Invalid Jira credentials"
        );
      }
      
      // Credentials are valid, save them permanently
      setCredentials(credentials);
      setIsConnected(true);
      
      toast({
        title: "Connection Successful",
        description: `Connected to Jira at ${cleanDomain}`,
        variant: "success",
      });
      
      setIsLoading(false);
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message || "Failed to connect to Jira");
      setIsConnected(false);
      setIsLoading(false);
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Jira",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Connect to Jira</span>
          {isConnected && <CheckCircle className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>
          Enter your Jira credentials to connect and save your settings
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {loginError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="domain">Jira Domain</Label>
            <Input
              id="domain"
              placeholder="your-company.atlassian.net"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              This is usually your-company.atlassian.net (without https://)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your-email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="apiToken">API Token</Label>
            <Input
              id="apiToken"
              type="password"
              placeholder="Your Jira API token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              You can generate an API token in your{" "}
              <a 
                href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Atlassian account settings
              </a>
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                {isConnected ? <Save className="h-4 w-4 mr-2" /> : null}
                {isConnected ? "Save Connection" : "Test & Save Connection"}
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default JiraLogin;
