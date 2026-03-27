import { useState } from 'react';
import { 
  Download, FileText, Shield, Database, 
  GitBranch, ClipboardCheck, Loader2, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

const EvidencePackDownloader = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([
    'architecture',
    'data-flow',
    'ethics-charter',
    'pilot-summary',
  ]);

  const documents = [
    {
      id: 'architecture',
      title: 'System Architecture Overview',
      description: 'Technical diagram showing system components and data boundaries',
      icon: GitBranch,
      size: '~2 pages',
    },
    {
      id: 'data-flow',
      title: 'Data Flow Documentation',
      description: 'How data moves through the system, what is collected, and where it goes',
      icon: Database,
      size: '~3 pages',
    },
    {
      id: 'ethics-charter',
      title: 'Ethics Charter',
      description: 'Our commitments, principles, and boundaries—what we do and never do',
      icon: Shield,
      size: '~2 pages',
    },
    {
      id: 'pilot-summary',
      title: 'Pilot Program Summary',
      description: 'Template for documenting pilot outcomes and compliance metrics',
      icon: ClipboardCheck,
      size: '~1 page',
    },
    {
      id: 'privacy-policy',
      title: 'Privacy Policy (Full)',
      description: 'Complete privacy policy in downloadable format',
      icon: FileText,
      size: '~4 pages',
    },
    {
      id: 'dpa-template',
      title: 'Data Processing Agreement Template',
      description: 'Template DPA for institutional compliance requirements',
      icon: FileText,
      size: '~3 pages',
    },
  ];

  const toggleDocument = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const generateEvidencePack = async () => {
    if (selectedDocs.length === 0) {
      toast({
        title: 'No documents selected',
        description: 'Please select at least one document to download.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    // Generate HTML content for the evidence pack
    const htmlContent = generateHtmlPack(selectedDocs);
    
    // Create and download the file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HumanFirst_Evidence_Pack_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsGenerating(false);

    toast({
      title: 'Evidence pack downloaded',
      description: 'Open the HTML file in any browser to view or print.',
    });
  };

  const generateHtmlPack = (docs: string[]): string => {
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let content = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HumanFirst Evidence Pack - ${date}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; }
    h1 { color: #0d9488; border-bottom: 3px solid #0d9488; padding-bottom: 10px; }
    h2 { color: #1a1a1a; margin-top: 40px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
    h3 { color: #525252; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #0d9488; }
    .date { color: #737373; margin-top: 10px; }
    .section { margin-bottom: 40px; page-break-inside: avoid; }
    .badge { display: inline-block; background: #0d948815; color: #0d9488; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-bottom: 10px; }
    .important { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; }
    .commitment { background: #dcfce7; border-left: 4px solid #22c55e; padding: 12px 16px; margin: 16px 0; }
    .never { background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #e5e5e5; padding: 12px; text-align: left; }
    th { background: #f5f5f5; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #737373; font-size: 14px; }
    @media print { body { padding: 20px; } .section { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🛡️ HumanFirst</div>
    <h1>Audit & Evidence Pack</h1>
    <div class="date">Generated: ${date}</div>
  </div>

  <div class="section">
    <p>This document package provides comprehensive documentation of HumanFirst's privacy practices, 
    technical architecture, and ethical commitments for compliance review, institutional audits, 
    and regulatory documentation purposes.</p>
  </div>
`;

    if (docs.includes('architecture')) {
      content += `
  <div class="section">
    <h2>System Architecture Overview</h2>
    <div class="badge">Technical Documentation</div>
    
    <h3>High-Level Architecture</h3>
    <p>HumanFirst operates as a policy-based access control system with the following components:</p>
    
    <table>
      <tr><th>Component</th><th>Function</th><th>Data Handled</th></tr>
      <tr><td>Web Application</td><td>Admin interface for policy management</td><td>Policy definitions, admin actions</td></tr>
      <tr><td>Student Client</td><td>Displays active policies to students</td><td>Policy status (read-only)</td></tr>
      <tr><td>Policy Engine</td><td>Enforces time-based restrictions</td><td>Timestamps, category rules</td></tr>
      <tr><td>Audit System</td><td>Logs administrative actions</td><td>Action metadata only</td></tr>
    </table>
    
    <h3>Data Boundaries</h3>
    <div class="commitment">
      <strong>Inside System Boundary:</strong> Policy metadata, timestamps, focus events, admin actions
    </div>
    <div class="never">
      <strong>Outside System Boundary (Never Accessed):</strong> Screen content, keystrokes, camera/mic, browsing history, document content
    </div>
    
    <h3>Network Architecture</h3>
    <ul>
      <li>All traffic encrypted with TLS 1.3</li>
      <li>Data at rest encrypted with AES-256</li>
      <li>No client-side content capture capabilities</li>
      <li>Network monitoring limited to connectivity status</li>
    </ul>
  </div>
`;
    }

    if (docs.includes('data-flow')) {
      content += `
  <div class="section">
    <h2>Data Flow Documentation</h2>
    <div class="badge">Privacy Documentation</div>
    
    <h3>Data Collection Points</h3>
    <table>
      <tr><th>Data Type</th><th>Collection Point</th><th>Purpose</th><th>Retention</th></tr>
      <tr><td>Account Info</td><td>Registration</td><td>Authentication</td><td>Account lifetime</td></tr>
      <tr><td>Policy Events</td><td>Policy engine</td><td>Enforcement tracking</td><td>Configurable (default 30 days)</td></tr>
      <tr><td>Focus Events</td><td>Client app</td><td>Integrity monitoring</td><td>Configurable (default 30 days)</td></tr>
      <tr><td>Admin Actions</td><td>Web app</td><td>Accountability</td><td>Configurable (default 90 days)</td></tr>
    </table>
    
    <h3>Data Flow Diagram</h3>
    <pre style="background: #f5f5f5; padding: 20px; overflow-x: auto;">
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Student Client │────▶│  Policy Engine  │────▶│  Audit System   │
│  (Read-only)    │     │  (Enforcement)  │     │  (Logging)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Encrypted Database                          │
│  • Policy definitions    • Timestamps    • Admin actions        │
│  • NO content, keystrokes, screenshots, or behavioral data      │
└─────────────────────────────────────────────────────────────────┘
    </pre>
    
    <h3>Data NOT Collected</h3>
    <div class="never">
      <ul>
        <li>Screen content or screenshots</li>
        <li>Keystroke data or typing patterns</li>
        <li>Camera or microphone input</li>
        <li>Document or message content</li>
        <li>Browsing history or URLs visited</li>
        <li>Application usage outside policy scope</li>
      </ul>
    </div>
  </div>
`;
    }

    if (docs.includes('ethics-charter')) {
      content += `
  <div class="section">
    <h2>Ethics Charter</h2>
    <div class="badge">Governance Document</div>
    
    <h3>Core Principles</h3>
    <div class="commitment">
      <strong>1. Privacy by Design:</strong> Privacy protections are built into the system architecture, not added as an afterthought.
    </div>
    <div class="commitment">
      <strong>2. Minimal Data Collection:</strong> We collect only what is strictly necessary for policy enforcement.
    </div>
    <div class="commitment">
      <strong>3. Transparency:</strong> Students always know when policies are active and what restrictions apply.
    </div>
    <div class="commitment">
      <strong>4. No Accusations:</strong> We provide tools for focus, not systems for making academic integrity judgments.
    </div>
    
    <h3>Firm Boundaries (What We NEVER Do)</h3>
    <div class="never">
      <ul>
        <li><strong>No Content Reading:</strong> We never access, read, or analyze user-generated content</li>
        <li><strong>No Keystroke Logging:</strong> We do not track typing patterns or individual keystrokes</li>
        <li><strong>No Screen Recording:</strong> We never capture or transmit screen content</li>
        <li><strong>No Camera/Microphone:</strong> We never access recording devices</li>
        <li><strong>No Behavioral Profiling:</strong> We do not build user behavior profiles</li>
        <li><strong>No Data Sales:</strong> User data is never sold or shared for marketing</li>
      </ul>
    </div>
    
    <h3>Accountability Measures</h3>
    <ul>
      <li>All administrative actions are logged in immutable audit trails</li>
      <li>Role-based access ensures appropriate permissions</li>
      <li>Pilot mode allows testing before enforcement</li>
      <li>Public policy sharing enables student verification</li>
    </ul>
  </div>
`;
    }

    if (docs.includes('pilot-summary')) {
      content += `
  <div class="section">
    <h2>Pilot Program Summary Template</h2>
    <div class="badge">Compliance Template</div>
    
    <div class="important">
      <strong>Instructions:</strong> Complete this template at the end of your pilot period to document outcomes.
    </div>
    
    <h3>Pilot Information</h3>
    <table>
      <tr><td><strong>Institution Name:</strong></td><td>_______________________</td></tr>
      <tr><td><strong>Pilot Start Date:</strong></td><td>_______________________</td></tr>
      <tr><td><strong>Pilot End Date:</strong></td><td>_______________________</td></tr>
      <tr><td><strong>Devices Enrolled:</strong></td><td>_______________________</td></tr>
      <tr><td><strong>Students Covered:</strong></td><td>_______________________</td></tr>
    </table>
    
    <h3>Compliance Metrics</h3>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Policies Created</td><td>_______</td></tr>
      <tr><td>Exams Conducted</td><td>_______</td></tr>
      <tr><td>Focus Events Detected</td><td>_______</td></tr>
      <tr><td>Policy Compliance Rate</td><td>_______%</td></tr>
    </table>
    
    <h3>Privacy Verification</h3>
    <p>Confirm the following privacy commitments were maintained:</p>
    <ul>
      <li>☐ No screen content was captured</li>
      <li>☐ No keystroke data was logged</li>
      <li>☐ No camera/microphone access occurred</li>
      <li>☐ Students were informed of active policies</li>
      <li>☐ Data retention settings were configured appropriately</li>
    </ul>
    
    <h3>Signatures</h3>
    <table>
      <tr><td><strong>IT Administrator:</strong></td><td>_________________ Date: _______</td></tr>
      <tr><td><strong>Compliance Officer:</strong></td><td>_________________ Date: _______</td></tr>
    </table>
  </div>
`;
    }

    if (docs.includes('privacy-policy')) {
      content += `
  <div class="section">
    <h2>Privacy Policy (Full Text)</h2>
    <div class="badge">Legal Document</div>
    
    <h3>1. Information We Collect</h3>
    <p><strong>Information You Provide:</strong> Account information (email, name) when you register; Organization information for administrators.</p>
    <p><strong>Automatically Collected:</strong> Policy enforcement metadata; Focus events (NOT what you switched to); Network connectivity events (NOT browsing history); Timestamps of administrative actions.</p>
    <div class="never"><strong>Never Collected:</strong> Screen content, keystrokes, camera/mic data, document content, behavioral profiles.</div>
    
    <h3>2. How We Use Information</h3>
    <p>Used for: Enforcing exam policies; Providing transparency; Generating aggregate reports; Maintaining audit logs.</p>
    <p>Never used for: Advertising; Third-party sales; Behavioral profiling; Academic integrity judgments.</p>
    
    <h3>3. Data Sharing</h3>
    <p>Shared with your institution's administrators only. Never sold to third parties. Infrastructure providers bound by DPAs.</p>
    
    <h3>4. Data Retention</h3>
    <p>Configurable by your institution. Automatic deletion after retention period. Permanent deletion from backups within 30 days.</p>
    
    <h3>5. Your Rights</h3>
    <p>Access, correction, deletion, portability, objection, and consent withdrawal rights. Contact privacy@humanfirst.edu.</p>
    
    <h3>6. Security</h3>
    <p>TLS 1.3 in transit; AES-256 at rest; RBAC; Regular audits; 72-hour breach notification.</p>
    
    <h3>7. Children's Privacy</h3>
    <p>Minimal data collection regardless of age. School consent provisions under FERPA/COPPA.</p>
    
    <h3>8. Policy Changes</h3>
    <p>30-day notice for material changes. Email and in-app notification.</p>
  </div>
`;
    }

    if (docs.includes('dpa-template')) {
      content += `
  <div class="section">
    <h2>Data Processing Agreement Template</h2>
    <div class="badge">Legal Template</div>
    
    <div class="important">
      <strong>Note:</strong> This is a template. Consult with legal counsel before execution.
    </div>
    
    <h3>Parties</h3>
    <p><strong>Data Controller:</strong> [Institution Name] ("Controller")</p>
    <p><strong>Data Processor:</strong> HumanFirst Inc. ("Processor")</p>
    
    <h3>Subject Matter and Duration</h3>
    <p>Processing of personal data for exam policy enforcement during the term of service agreement.</p>
    
    <h3>Nature and Purpose</h3>
    <ul>
      <li>Enforcement of time-based exam policies</li>
      <li>Detection of focus and connectivity events</li>
      <li>Maintenance of administrative audit logs</li>
    </ul>
    
    <h3>Categories of Data Subjects</h3>
    <ul>
      <li>Students enrolled in covered programs</li>
      <li>Administrative staff with system access</li>
    </ul>
    
    <h3>Categories of Personal Data</h3>
    <ul>
      <li>Account identifiers (email, name)</li>
      <li>Policy event timestamps</li>
      <li>Focus/connectivity event metadata</li>
      <li>Administrative action logs</li>
    </ul>
    
    <h3>Processor Obligations</h3>
    <ul>
      <li>Process data only on documented instructions</li>
      <li>Ensure confidentiality of processing personnel</li>
      <li>Implement appropriate security measures</li>
      <li>Assist Controller with data subject rights</li>
      <li>Delete data upon termination</li>
      <li>Provide information for compliance audits</li>
    </ul>
    
    <h3>Sub-processors</h3>
    <p>Processor uses the following sub-processors: [List infrastructure providers]</p>
    
    <h3>Signatures</h3>
    <table>
      <tr><td><strong>For Controller:</strong></td><td>_________________ Date: _______</td></tr>
      <tr><td><strong>For Processor:</strong></td><td>_________________ Date: _______</td></tr>
    </table>
  </div>
`;
    }

    content += `
  <div class="footer">
    <p>HumanFirst Evidence Pack • Generated ${date}</p>
    <p>This document is for informational and compliance purposes. 
    Consult with legal counsel for specific regulatory requirements.</p>
    <p>Questions: compliance@humanfirst.edu</p>
  </div>
</body>
</html>
`;

    return content;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Select Documents to Include
        </CardTitle>
        <CardDescription>
          Choose which documents to include in your evidence pack. The pack will be generated as a 
          printable HTML file suitable for compliance documentation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedDocs.includes(doc.id)
                  ? 'bg-primary/5 border-primary'
                  : 'bg-muted/50 border-border hover:border-primary/50'
              }`}
              onClick={() => toggleDocument(doc.id)}
            >
              <Checkbox
                checked={selectedDocs.includes(doc.id)}
                onCheckedChange={() => toggleDocument(doc.id)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <doc.icon className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-medium text-foreground">{doc.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {doc.size}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="font-medium text-foreground">
              {selectedDocs.length} document{selectedDocs.length !== 1 ? 's' : ''} selected
            </p>
            <p className="text-sm text-muted-foreground">
              Download as printable HTML file
            </p>
          </div>
          <Button onClick={generateEvidencePack} disabled={isGenerating || selectedDocs.length === 0}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Evidence Pack
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EvidencePackDownloader;
