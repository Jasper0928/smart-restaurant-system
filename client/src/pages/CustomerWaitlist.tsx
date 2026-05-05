import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLiff } from "@/contexts/LiffContext";
import { toast } from "sonner";
import { Clock, Users, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomerWaitlist() {
  const { waitlistId } = useParams();
  const { isReady, isLoggedIn, profile } = useLiff();
  const [restaurantId] = useState(1);

  const { data: ewtData, isLoading: isLoadingEwt } = trpc.waitlist.getEWT.useQuery(
    { restaurantId },
    { refetchInterval: 5000 } // Poll every 5s
  );

  const updateStatus = trpc.waitlist.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update status");
    }
  });

  if (!isReady || isLoadingEwt) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading your waitlist status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 animate-in fade-in duration-500">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="text-center space-y-2">
          {profile && (
            <div className="flex justify-center mb-4">
              {profile.pictureUrl ? (
                <img src={profile.pictureUrl} alt={profile.displayName} className="w-16 h-16 rounded-full border border-border shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-xl font-medium text-secondary-foreground">
                    {profile.displayName.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight">
            Hi {profile?.displayName || "Guest"},
          </h1>
          <p className="text-muted-foreground">
            Here is your real-time waitlist status
          </p>
        </div>

        <Card className="border-border/50 shadow-sm overflow-hidden">
          <div className="bg-primary h-1 w-full" />
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">Your Status</CardTitle>
            <CardDescription>We'll notify you when your table is ready</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center p-4 bg-secondary rounded-xl">
                <Users className="w-6 h-6 text-muted-foreground mb-2" />
                <span className="text-3xl font-bold">{ewtData?.queuePosition || 0}</span>
                <span className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">Ahead of You</span>
              </div>
              
              <div className="flex flex-col items-center justify-center p-4 bg-secondary rounded-xl">
                <Clock className="w-6 h-6 text-muted-foreground mb-2" />
                <span className="text-3xl font-bold">{ewtData?.ewt || 0}</span>
                <span className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">Est. Min</span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border/50">
              <p className="text-sm font-medium text-center mb-4">Ready to be seated soon?</p>
              
              <Button 
                variant="default" 
                className="w-full justify-between h-12"
                onClick={() => updateStatus.mutate({ waitlistId: parseInt(waitlistId || "0"), status: "coming" })}
                disabled={updateStatus.isPending}
              >
                <span>I'm on my way</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-10"
                  onClick={() => updateStatus.mutate({ waitlistId: parseInt(waitlistId || "0"), status: "reserved_5min" })}
                  disabled={updateStatus.isPending}
                >
                  Hold 5 mins
                </Button>
                <Button 
                  variant="ghost" 
                  className="h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => updateStatus.mutate({ waitlistId: parseInt(waitlistId || "0"), status: "cancelled" })}
                  disabled={updateStatus.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
