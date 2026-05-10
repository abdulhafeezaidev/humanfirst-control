import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  ShieldCheck, 
  AlertCircle, 
  Settings, 
  RefreshCw,
  ExternalLink,
  Clipboard,
  CheckCircle2,
  XCircle,
  Activity,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface AgentStatus {
  version: string;
  serviceStatus: 'Running' | 'Stopped' | 'Error' | 'Not Installed';
  connectionType: 'IPC' | 'Polling' | 'None';
  lastPolicySync: string;
  activePolicies: number;
}

const DesktopDiagnostics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AgentStatus>({
    version: '1.0.0',
    serviceStatus: 'Running',
    connectionType: 'IPC',
    lastPolicySync: new Date().toISOString(),
    activePolicies: 2
  });

  const [tests, setTests] = useState([
    { id: 'connection', name: 'Agent Connection', status: 'pass', lastRun: 'Just now' },
    { id: 'wfp', name: 'Network Filter Driver', status: 'pass', lastRun: 'Just now' },
    { id: 'policy', name: 'Policy Sync Engine', status: 'pass', lastRun: 'Just now' },
    { id: 'integrity', name: 'File Integrity', status: 'pending', lastRun: 'Never' },
  ]);

  const runDiagnostics = async () => {
    setLoading(true);
    // Simulated diagnostics
    await new Promise(resolve => setTimeout(resolve, 1500));
    setTests(prev => prev.map(t => ({ ...t, status: 'pass', lastRun: 'Just now' })));
    setLoading(false);
    toast({
      title: "Diagnostics Complete",
      description: "All desktop components are functioning correctly.",
    });
  };

  const openLogs = () => {
    // This would typically use window.electron.ipcRenderer.send('open-logs')
    toast({
      title: "Opening Logs",
      description: "Log folder should open shortly.",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Monitor className="w-8 h-8 text-primary" />
            Desktop Diagnostics
          </h1>
          <p className="text-muted-foreground mt-1">
            System status and troubleshooting for the HumanFirst Control Agent.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openLogs}>
            <Terminal className="w-4 h-4 mr-2" />
            View Logs
          </Button>
          <Button size="sm" onClick={runDiagnostics} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Run System Check
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Core Components</CardTitle>
              <Badge variant={status.serviceStatus === 'Running' ? 'success' : 'destructive'}>
                {status.serviceStatus}
              </Badge>
            </div>
            <CardDescription>
              Real-time status of the local enforcement agent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase">Agent Version</span>
                <p className="text-xl font-mono font-bold text-foreground">{status.version}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase">Protocol</span>
                <p className="text-xl font-bold text-foreground">{status.connectionType}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Self-Maintenance Task</span>
                <span className="text-foreground font-medium">98% Health</span>
              </div>
              <Progress value={98} className="h-2" />
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Diagnostic Tests</h4>
              <div className="space-y-2">
                {tests.map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg bg-background/50">
                    <div className="flex items-center gap-3">
                      {test.status === 'pass' && <CheckCircle2 className="w-5 h-5 text-success" />}
                      {test.status === 'fail' && <XCircle className="w-5 h-5 text-destructive" />}
                      {test.status === 'pending' && <Activity className="w-5 h-5 text-muted-foreground animate-pulse" />}
                      <div>
                        <p className="text-sm font-medium leading-none">{test.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Last run: {test.lastRun}</p>
                      </div>
                    </div>
                    {test.status === 'fail' && <Button variant="ghost" size="sm">Fix</Button>}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Guide</CardTitle>
            <CardDescription>Essential information for users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                No-Action Required
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The HumanFirst Agent runs silently in the background. It will automatically activate 
                when an exam starts and deactivate when it ends.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                <div>
                  <p className="text-sm font-medium">Auto-Start</p>
                  <p className="text-xs text-muted-foreground">App will open on login if an exam is active.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                <div>
                  <p className="text-sm font-medium">Live Indicators</p>
                  <p className="text-xs text-muted-foreground">Banner will appear if restrictions are in effect.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                <div>
                  <p className="text-sm font-medium">Safe Exit</p>
                  <p className="text-xs text-muted-foreground">Close normally when the exam concludes.</p>
                </div>
              </div>
            </div>

            <Alert className="mt-4">
              <UserCheck className="h-4 w-4" />
              <AlertTitle>Authenticated</AlertTitle>
              <AlertDescription className="text-xs">
                Your device is linked to your institutional account.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground">
              <Info className="w-3 h-3 mr-2" />
              Detailed Setup Guide
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="common" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-12">
              <TabsTrigger value="common" className="data-[state=active]:bg-muted">Common Issues</TabsTrigger>
              <TabsTrigger value="network" className="data-[state=active]:bg-muted">Network Help</TabsTrigger>
              <TabsTrigger value="privacy" className="data-[state=active]:bg-muted">Privacy Info</TabsTrigger>
            </TabsList>
            <div className="p-6">
              <TabsContent value="common" className="mt-0 space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <section className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-warning" />
                      "Stuck on Splash Screen"
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      This usually means the background agent is starting up. Wait 15-30 seconds. 
                      If it persists, click "Run System Check" above.
                    </p>
                  </section>
                  <section className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" />
                      "Service Not Found"
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      The Windows service might be disabled. Run the <code>install-agent.ps1</code> script 
                      located in your application directory as Administrator.
                    </p>
                  </section>
                </div>
              </TabsContent>
              <TabsContent value="network" className="mt-0">
                <p className="text-sm text-muted-foreground">
                  Our network filter (WFP) requires specific permissions. Ensure your firewall 
                  or third-party antivirus is not blocking "ControlPlane.Agent.exe".
                </p>
              </TabsContent>
              <TabsContent value="privacy" className="mt-0">
                <p className="text-sm text-muted-foreground">
                  HumanFirst respects your privacy by design. We use endpoint filtering to block 
                  restricted categories without routing your traffic through any proxy or inspecting 
                  data content.
                </p>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DesktopDiagnostics;
