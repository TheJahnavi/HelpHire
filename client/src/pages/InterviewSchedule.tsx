import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function InterviewSchedule() {
  const [token, setToken] = useState("");
  const [selectedDateTime, setSelectedDateTime] = useState("");
  const [candidate, setCandidate] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Get token from URL query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);

  // Fetch candidate and job details using the token
  const { data: candidateData, isLoading: candidateLoading, error: candidateError } = useQuery({
    queryKey: ["candidate-details", token],
    queryFn: async () => {
      if (!token) return null;
      
      // In a real implementation, this would call a public endpoint
      // For now, we'll simulate the data
      return {
        candidateName: "John Doe",
        email: "john.doe@example.com",
        jobTitle: "Senior Software Engineer",
        companyName: "Tech Corp"
      };
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (candidateData) {
      setCandidate(candidateData);
    }
  }, [candidateData]);

  const handleSchedule = async () => {
    if (!token || !selectedDateTime) {
      toast({
        title: "Error",
        description: "Please select a date and time for the interview",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest('/api/public/schedule-interview', {
        method: 'POST',
        body: {
          token,
          datetime: selectedDateTime
        }
      });

      if (response.success) {
        setIsScheduled(true);
        setMeetingLink(response.meetingLink);
        toast({
          title: "Success",
          description: "Interview scheduled successfully!",
        });
      } else {
        throw new Error(response.message || "Failed to schedule interview");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule interview",
        variant: "destructive",
      });
    }
  };

  if (candidateLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading interview details...</p>
        </div>
      </div>
    );
  }

  if (candidateError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load interview details</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{(candidateError as Error).message}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isScheduled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Interview Scheduled!</CardTitle>
            <CardDescription>Your interview has been successfully scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                Thank you, <strong>{candidate?.candidateName}</strong>. Your interview has been scheduled for:
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-semibold">{new Date(selectedDateTime).toLocaleString()}</p>
              </div>
              <p>
                You will receive a calendar invitation via email. Please join the interview using the following link:
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <a 
                  href={meetingLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {meetingLink}
                </a>
              </div>
              <Button className="w-full" onClick={() => window.location.href = "/"}>
                Return to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Schedule Your Interview</CardTitle>
          <CardDescription>
            {candidate ? (
              <>
                Hello, <strong>{candidate.candidateName}</strong>. You've been invited to interview for the position of{" "}
                <strong>{candidate.jobTitle}</strong> at <strong>{candidate.companyName}</strong>.
              </>
            ) : (
              "Please provide your interview scheduling details."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="datetime">Select Date and Time</Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={selectedDateTime}
                onChange={(e) => setSelectedDateTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button className="w-full" onClick={handleSchedule}>
              Schedule Interview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}