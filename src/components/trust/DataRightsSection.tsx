import { User, Download, Trash2, Edit, Eye, FileText, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const DataRightsSection = () => {
  const rights = [
    {
      icon: Eye,
      title: 'Right to Access',
      description: 'Request a copy of all personal data we hold about you',
      action: 'Request Data Export',
    },
    {
      icon: Edit,
      title: 'Right to Correction',
      description: 'Ask us to correct any inaccurate information',
      action: 'Request Correction',
    },
    {
      icon: Trash2,
      title: 'Right to Deletion',
      description: 'Request deletion of your personal data',
      action: 'Request Deletion',
    },
    {
      icon: Download,
      title: 'Right to Portability',
      description: 'Receive your data in a machine-readable format',
      action: 'Download Data',
    },
  ];

  const handleRightsRequest = (right: string) => {
    window.location.href = `mailto:privacy@humanfirst.edu?subject=Data Rights Request: ${right}&body=Please describe your request in detail.`;
  };

  return (
    <div>
      <div className="flex items-center justify-center gap-3 mb-4">
        <User className="w-8 h-8 text-primary" />
        <h2 className="text-3xl font-bold text-foreground">
          Your Data Rights
        </h2>
      </div>
      <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
        You have control over your personal data. Here's how to exercise your rights.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {rights.map((right) => (
          <Card key={right.title}>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <right.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{right.title}</CardTitle>
                  <CardDescription>{right.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleRightsRequest(right.title)}
              >
                <Mail className="w-4 h-4 mr-2" />
                {right.action}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <FileText className="w-6 h-6 text-muted-foreground flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">How to Submit a Request</h3>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li>1. Click any button above to open an email to our privacy team</li>
                <li>2. Include your full name and the email associated with your account</li>
                <li>3. Describe your request in detail</li>
                <li>4. We will verify your identity and respond within 30 days</li>
              </ol>
              <p className="text-sm text-muted-foreground mt-4">
                <strong>Contact:</strong> privacy@humanfirst.edu
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataRightsSection;
