import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PrivacyPolicy = () => {
  const sections = [
    {
      id: 'what-we-collect',
      title: '1. What Information We Collect',
      content: `
**Information You Provide:**
- Account information (email, name) when you register
- Organization information for administrators

**Information Collected Automatically:**
- Policy enforcement metadata (start/end times of restrictions)
- Focus events (when the app loses/regains focus—NOT what you switched to)
- Network connectivity events (connection lost/restored—NOT browsing history)
- Timestamps of administrative actions

**What We NEVER Collect:**
- Screen content, screenshots, or recordings
- Keystroke data or typing patterns
- Camera or microphone data
- Content of documents, messages, or browsing
- Behavioral profiles or analytics data
      `.trim(),
    },
    {
      id: 'how-we-use',
      title: '2. How We Use Your Information',
      content: `
**We use collected information only for:**
- Enforcing exam policies set by your institution
- Providing transparency about active restrictions
- Generating aggregate compliance reports (no personal data)
- Maintaining audit logs for institutional accountability
- Technical troubleshooting and service improvement

**We NEVER use your information for:**
- Advertising or marketing
- Selling to third parties
- Building behavioral profiles
- Making academic integrity judgments
- Any purpose beyond exam policy enforcement
      `.trim(),
    },
    {
      id: 'data-sharing',
      title: '3. Who We Share Data With',
      content: `
**Your Institution:**
- Administrators can see aggregate compliance data
- Audit logs show administrative actions (not student content)
- Focus/tamper events are visible to designated staff

**Third Parties:**
- We do NOT sell data to any third party
- We do NOT share personal data with advertisers
- We may use secure infrastructure providers (AWS, Supabase) to host data
- We may share data if legally required (with notice when possible)

**Data Processors:**
Our infrastructure providers are bound by data processing agreements and cannot access your data for their own purposes.
      `.trim(),
    },
    {
      id: 'data-retention',
      title: '4. How Long We Keep Your Data',
      content: `
**Retention Periods:**
- Audit logs: Configurable by your institution (default 90 days)
- Tamper events: Configurable by your institution (default 30 days)
- Account data: Retained while your account is active
- Policy data: Retained while policies are active

**Automatic Deletion:**
- Data is automatically deleted after the retention period
- Your institution controls retention settings
- You can request early deletion (subject to legal requirements)

**After Deletion:**
- Data is permanently removed from our systems
- Backup copies are purged within 30 days
- We cannot recover deleted data
      `.trim(),
    },
    {
      id: 'your-rights',
      title: '5. Your Privacy Rights',
      content: `
**You have the right to:**
- **Access:** Request a copy of your personal data
- **Correction:** Ask us to correct inaccurate information
- **Deletion:** Request deletion of your data (with some exceptions)
- **Portability:** Receive your data in a common format
- **Objection:** Object to certain types of processing
- **Withdraw Consent:** Revoke consent for optional processing

**How to Exercise Your Rights:**
Contact your institution's HumanFirst administrator or email privacy@humanfirst.edu

**Response Time:**
We respond to rights requests within 30 days (or sooner if required by law).
      `.trim(),
    },
    {
      id: 'security',
      title: '6. How We Protect Your Data',
      content: `
**Technical Measures:**
- Encryption in transit (TLS 1.3)
- Encryption at rest (AES-256)
- Role-based access controls
- Regular security audits
- Automated vulnerability scanning

**Organizational Measures:**
- Privacy by design principles
- Minimal data collection philosophy
- Staff training on data protection
- Incident response procedures
- Regular policy reviews

**Breach Notification:**
If a data breach occurs, we will notify affected users and regulators as required by law, typically within 72 hours of discovery.
      `.trim(),
    },
    {
      id: 'children',
      title: '7. Children\'s Privacy',
      content: `
**For Students Under 18:**
- We collect minimal data regardless of age
- Parental consent may be obtained through your institution
- Parents can request access to their child's data
- COPPA (US) and age-appropriate design principles apply

**School Consent:**
For educational contexts, your school may provide consent on behalf of parents under FERPA and COPPA school consent provisions.
      `.trim(),
    },
    {
      id: 'changes',
      title: '8. Changes to This Policy',
      content: `
**How We Handle Changes:**
- Material changes announced at least 30 days before taking effect
- Notice provided via email and in-app notification
- Previous versions archived and available on request
- Your continued use after changes constitutes acceptance

**Last Updated:** January 2026

**Questions?**
Contact privacy@humanfirst.edu or your institution's administrator.
      `.trim(),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Plain-Language Privacy Policy
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Written to be understood, not to obscure. Expand each section to read more.
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {sections.map((section) => (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="text-left">
                {section.title}
              </AccordionTrigger>
              <AccordionContent>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {section.content.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return (
                        <h4 key={i} className="font-semibold text-foreground mt-4 mb-2">
                          {line.replace(/\*\*/g, '')}
                        </h4>
                      );
                    }
                    if (line.startsWith('- ')) {
                      return (
                        <p key={i} className="ml-4 my-1">
                          • {line.substring(2)}
                        </p>
                      );
                    }
                    if (line.trim() === '') {
                      return <br key={i} />;
                    }
                    return <p key={i} className="my-2">{line}</p>;
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default PrivacyPolicy;
