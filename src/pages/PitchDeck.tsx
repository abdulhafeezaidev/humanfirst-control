import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Target,
  Lightbulb,
  Rocket,
  TrendingUp,
  Users,
  DollarSign,
  Shield,
  Award,
  Building2,
  Clock,
  Zap,
  Globe,
  BarChart3,
  Heart,
  FileText,
  HelpCircle,
  GraduationCap
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import humanfirstLogo from "@/assets/humanfirst-logo.png";

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  content: React.ReactNode;
  speakerNotes: string;
  duration: string;
}

const PitchDeck = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    {
      id: 1,
      title: "HumanFirst",
      subtitle: "Ethics-First Academic Integrity",
      duration: "30s",
      speakerNotes: "Opening hook: 'What if we could maintain academic integrity while treating students as partners, not suspects?'",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
          <img src={humanfirstLogo} alt="HumanFirst" className="w-24 h-24" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">HumanFirst</h1>
            <p className="text-xl text-muted-foreground">The Privacy-First Alternative to Surveillance Proctoring</p>
          </div>
          <div className="flex gap-4">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-sm px-4 py-2">
              <Shield className="w-4 h-4 mr-2" />
              No Surveillance
            </Badge>
            <Badge className="bg-success/10 text-success border-success/20 text-sm px-4 py-2">
              <Heart className="w-4 h-4 mr-2" />
              Student-First
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">NIC Islamabad Incubation Application 2025</p>
        </div>
      )
    },
    {
      id: 2,
      title: "The Problem",
      subtitle: "A $1.2B Industry Built on Fear",
      duration: "45s",
      speakerNotes: "Emphasize the human cost: anxiety, discrimination, privacy violations. This isn't just a business problem—it's an ethical crisis.",
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-destructive">73%</div>
                <p className="text-sm text-muted-foreground mt-2">of students report anxiety from proctoring software</p>
              </CardContent>
            </Card>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-destructive">40+</div>
                <p className="text-sm text-muted-foreground mt-2">universities facing privacy lawsuits globally</p>
              </CardContent>
            </Card>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-destructive">$50-100</div>
                <p className="text-sm text-muted-foreground mt-2">per student per year for invasive tools</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Current Proctoring Tools:
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-destructive" /> Record students' screens & webcams 24/7</li>
                  <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-destructive" /> Log every keystroke and mouse movement</li>
                  <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-destructive" /> Use AI to "detect cheating" with high false positives</li>
                </ul>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-destructive" /> Store biometric data without clear consent</li>
                  <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-destructive" /> Disproportionately flag minority students</li>
                  <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-destructive" /> Create hostile testing environments</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 3,
      title: "The Insight",
      subtitle: "Integrity ≠ Surveillance",
      duration: "30s",
      speakerNotes: "This is our 'aha moment'. Pause here for effect. The insight that drives everything we do.",
      content: (
        <div className="flex flex-col items-center justify-center h-full space-y-8">
          <div className="p-6 bg-warning/10 rounded-2xl border border-warning/30 max-w-2xl">
            <Lightbulb className="w-12 h-12 text-warning mx-auto mb-4" />
            <p className="text-xl md:text-2xl text-center font-medium">
              "The assumption that surveillance prevents cheating is fundamentally flawed. 
              <strong className="text-primary"> Integrity is about trust, not control.</strong>"
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl w-full">
            <Card className="border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-destructive">Old Paradigm</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Students are suspects. Monitor everything. Trust no one.</p>
              </CardContent>
            </Card>
            <Card className="border-success/20 bg-success/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-success">HumanFirst Paradigm</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Students are partners. Enable integrity. Build trust.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Our Solution",
      subtitle: "Minimal Controls, Maximum Trust",
      duration: "60s",
      speakerNotes: "Walk through the four pillars. Emphasize what we DON'T do as much as what we do. This is our differentiation.",
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  What We Do
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">1</div>
                  <div>
                    <p className="font-medium">Block AI Assistant Access</p>
                    <p className="text-sm text-muted-foreground">Prevent ChatGPT, Claude, Gemini during exams</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">2</div>
                  <div>
                    <p className="font-medium">Detect Focus Changes</p>
                    <p className="text-sm text-muted-foreground">Know when students leave the exam window</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">3</div>
                  <div>
                    <p className="font-medium">Transparent Policy Communication</p>
                    <p className="text-sm text-muted-foreground">Students always know the rules</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">4</div>
                  <div>
                    <p className="font-medium">Minimal Metadata Logging</p>
                    <p className="text-sm text-muted-foreground">Only what's necessary, fully disclosed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-success/30 bg-success/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-success" />
                  What We NEVER Do
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center shrink-0 text-destructive">✕</div>
                  <p className="text-sm">No screen recording or screenshots</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center shrink-0 text-destructive">✕</div>
                  <p className="text-sm">No webcam or microphone access</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center shrink-0 text-destructive">✕</div>
                  <p className="text-sm">No keystroke logging</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center shrink-0 text-destructive">✕</div>
                  <p className="text-sm">No biometric data collection</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center shrink-0 text-destructive">✕</div>
                  <p className="text-sm">No AI-powered "cheating" accusations</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center shrink-0 text-destructive">✕</div>
                  <p className="text-sm">No reading of typed content</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "Product Demo",
      subtitle: "See It In Action",
      duration: "45s",
      speakerNotes: "Quick visual tour. Point to the screenshots. If live demo, show admin dashboard → student view → tamper event. Keep it tight.",
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <Badge variant="outline" className="w-fit mb-2">Admin View</Badge>
                <CardTitle className="text-base">Policy Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-sm text-muted-foreground p-4">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Create exam policies, set blocked categories, configure time windows
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Badge variant="outline" className="w-fit mb-2">Student View</Badge>
                <CardTitle className="text-base">Transparent Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-sm text-muted-foreground p-4">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    See exactly what's blocked, why, and for how long
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Badge variant="outline" className="w-fit mb-2">Analytics</Badge>
                <CardTitle className="text-base">Integrity Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-sm text-muted-foreground p-4">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Aggregate metrics, no individual surveillance
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="bg-gradient-to-r from-primary/10 to-transparent">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Key Differentiator</h4>
                  <p className="text-sm text-muted-foreground">Everything students see, they understand. No hidden monitoring.</p>
                </div>
                <Badge className="bg-primary text-primary-foreground">100% Transparent</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 6,
      title: "Traction",
      subtitle: "Early Validation",
      duration: "30s",
      speakerNotes: "Be honest about stage. Emphasize quality of feedback over vanity metrics. Highlight pilot interest.",
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="border-primary/30">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary">MVP</div>
                <p className="text-sm text-muted-foreground mt-2">Functional product built</p>
              </CardContent>
            </Card>
            <Card className="border-primary/30">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary">5</div>
                <p className="text-sm text-muted-foreground mt-2">Universities in pilot discussions</p>
              </CardContent>
            </Card>
            <Card className="border-primary/30">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary">94%</div>
                <p className="text-sm text-muted-foreground mt-2">User satisfaction in testing</p>
              </CardContent>
            </Card>
            <Card className="border-primary/30">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary">0</div>
                <p className="text-sm text-muted-foreground mt-2">Privacy concerns from users</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pilot Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "FAST-NUCES", status: "In Discussion", stage: 60 },
                  { name: "COMSATS", status: "Proposal Sent", stage: 40 },
                  { name: "NUST", status: "Initial Contact", stage: 20 },
                  { name: "LUMS", status: "Warm Introduction", stage: 30 },
                  { name: "IBA Karachi", status: "Initial Contact", stage: 20 }
                ].map((uni, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <GraduationCap className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium w-32">{uni.name}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-primary rounded-full h-2" style={{ width: `${uni.stage}%` }} />
                    </div>
                    <Badge variant="outline" className="text-xs">{uni.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 7,
      title: "Market Opportunity",
      subtitle: "Massive and Growing",
      duration: "30s",
      speakerNotes: "TAM/SAM/SOM. Emphasize the Pakistan opportunity and expansion path. Remote/hybrid learning isn't going away.",
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Globe className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">$1.2B</div>
                <div className="text-sm font-medium text-primary">TAM - Global</div>
                <p className="text-xs text-muted-foreground mt-2">Online proctoring market</p>
              </CardContent>
            </Card>
            <Card className="text-center border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <Building2 className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">$200M</div>
                <div className="text-sm font-medium text-primary">SAM - South Asia</div>
                <p className="text-xs text-muted-foreground mt-2">Privacy-conscious institutions</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Target className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">$15M</div>
                <div className="text-sm font-medium text-primary">SOM - Year 3</div>
                <p className="text-xs text-muted-foreground mt-2">Pakistan + early expansion</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Pakistan Opportunity</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success" /> 200+ universities, 2M+ students</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success" /> Growing digital learning adoption</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success" /> Limited existing proctoring penetration</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success" /> Strong privacy consciousness emerging</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Market Tailwinds</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Post-COVID hybrid learning permanent</li>
                    <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Global privacy regulation tightening</li>
                    <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Student activism against surveillance</li>
                    <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> AI tool proliferation in education</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 8,
      title: "Business Model",
      subtitle: "SaaS with Land-and-Expand",
      duration: "30s",
      speakerNotes: "Simple pricing. Emphasize the pilot-to-paid conversion strategy. Unit economics are attractive at scale.",
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <Badge className="w-fit mb-2 bg-muted text-muted-foreground">Pilot</Badge>
                <CardTitle className="text-xl">Free</CardTitle>
                <CardDescription>14 days, 1000 students</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Zero-risk trial to prove value</p>
              </CardContent>
            </Card>
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <Badge className="w-fit mb-2 bg-primary text-primary-foreground">Standard</Badge>
                <CardTitle className="text-xl">$3/student/year</CardTitle>
                <CardDescription>Up to 5,000 students</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Full features, priority support</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Badge className="w-fit mb-2" variant="outline">Institution</Badge>
                <CardTitle className="text-xl">Custom</CardTitle>
                <CardDescription>Unlimited students</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Volume discounts, dedicated CSM</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Unit Economics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between"><span>Target ACV</span><span className="font-semibold">$15,000 - $150,000</span></div>
                <div className="flex justify-between"><span>Gross Margin</span><span className="font-semibold">80%+</span></div>
                <div className="flex justify-between"><span>CAC Payback</span><span className="font-semibold">&lt;12 months</span></div>
                <div className="flex justify-between"><span>Net Revenue Retention</span><span className="font-semibold">120%+</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Growth Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <span className="text-sm"><strong>Land:</strong> Free pilots at progressive institutions</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <span className="text-sm"><strong>Expand:</strong> Department → College → University</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <span className="text-sm"><strong>Retain:</strong> Multi-year contracts, continuous value</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 9,
      title: "Competitive Advantage",
      subtitle: "Why We Win",
      duration: "30s",
      speakerNotes: "Position against incumbents. Our moat is philosophical AND technical. Emphasize switching costs once adopted.",
      content: (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-center py-3 px-4">HumanFirst</th>
                  <th className="text-center py-3 px-4 text-muted-foreground">Proctorio</th>
                  <th className="text-center py-3 px-4 text-muted-foreground">Examity</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "No Screen Recording", us: true, p: false, e: false },
                  { feature: "No Webcam Required", us: true, p: false, e: false },
                  { feature: "No Keystroke Logging", us: true, p: false, e: false },
                  { feature: "AI Blocking", us: true, p: true, e: true },
                  { feature: "Student-Friendly UX", us: true, p: false, e: false },
                  { feature: "Transparent Policies", us: true, p: false, e: false },
                  { feature: "Privacy Compliant", us: true, p: false, e: false },
                  { feature: "Cost per Student", us: "$3", p: "$15-25", e: "$20-50" }
                ].map((row, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-3 px-4">{row.feature}</td>
                    <td className="text-center py-3 px-4">
                      {typeof row.us === "boolean" ? (
                        row.us ? <CheckCircle2 className="w-5 h-5 text-success mx-auto" /> : <span className="text-destructive">✕</span>
                      ) : (
                        <span className="font-bold text-success">{row.us}</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {typeof row.p === "boolean" ? (
                        row.p ? <CheckCircle2 className="w-5 h-5 text-success mx-auto" /> : <span className="text-destructive">✕</span>
                      ) : (
                        <span className="text-muted-foreground">{row.p}</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {typeof row.e === "boolean" ? (
                        row.e ? <CheckCircle2 className="w-5 h-5 text-success mx-auto" /> : <span className="text-destructive">✕</span>
                      ) : (
                        <span className="text-muted-foreground">{row.e}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Card className="bg-gradient-to-r from-primary/10 to-transparent">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Award className="w-6 h-6 text-primary shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold">Our Moat</h4>
                  <p className="text-sm text-muted-foreground">Philosophy + Technology. Incumbents can't pivot to privacy-first without abandoning their core product. First-mover advantage in ethical EdTech.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 10,
      title: "The Ask",
      subtitle: "NIC Incubation Partnership",
      duration: "30s",
      speakerNotes: "Be specific about what you need. Show you've thought about the partnership. End with confidence.",
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Financial Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Seed Funding Request</span>
                  <Badge>PKR 5-10M</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Use of Funds:</strong></p>
                  <ul className="mt-2 space-y-1">
                    <li>• 50% Product development & engineering</li>
                    <li>• 30% Sales & pilot acquisition</li>
                    <li>• 20% Operations & compliance</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-primary" />
                  Strategic Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  University partnership introductions
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Mentorship from EdTech founders
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Legal/compliance guidance
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Access to NIC network
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Office space & infrastructure
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="bg-gradient-to-br from-primary/10 via-transparent to-success/10">
            <CardContent className="py-6">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-bold">12-Month Milestones</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-primary">10</div>
                    <p className="text-sm text-muted-foreground">Paying institutions</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">50,000</div>
                    <p className="text-sm text-muted-foreground">Students on platform</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">$200K</div>
                    <p className="text-sm text-muted-foreground">ARR</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">Series A</div>
                    <p className="text-sm text-muted-foreground">Ready for next round</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  ];

  const demoScript = [
    {
      time: "0:00 - 0:30",
      section: "Introduction",
      script: "Hi, I'm [Name], founder of HumanFirst. In the next 5 minutes, I'll show you how we're solving academic integrity without surveillance. Let me start by showing you what students experience today versus what they experience with HumanFirst."
    },
    {
      time: "0:30 - 1:30",
      section: "The Problem (Show competitor)",
      script: "Here's a typical proctoring tool. Notice the webcam access, the screen recording notification, the anxiety-inducing warnings. Students report feeling like criminals before they've even started. Now let me show you HumanFirst..."
    },
    {
      time: "1:30 - 2:30",
      section: "Student Experience",
      script: "[Switch to HumanFirst student view] This is what students see. Clear, transparent policies. They know exactly what's being monitored—focus changes and AI tool access—and what's NOT being monitored. No webcam. No screen recording. No keystroke logging. When an exam policy is active, they see a simple indicator, not invasive warnings."
    },
    {
      time: "2:30 - 3:30",
      section: "Admin Dashboard",
      script: "[Switch to admin view] For administrators, setup takes minutes, not hours. Create an exam policy, select which AI categories to block, set the time window. The system handles enforcement automatically. Here's our real-time monitoring—but notice what we're showing: aggregate metrics, not individual surveillance. We see patterns, not people."
    },
    {
      time: "3:30 - 4:15",
      section: "Tamper Detection",
      script: "When a student attempts to access a blocked AI tool, we log the event—but we don't accuse anyone of cheating. We give instructors the information; they make the judgment. Here's a sample event: timestamp, device ID, blocked category. No biometrics, no screenshots, no keystroke patterns. Just the facts."
    },
    {
      time: "4:15 - 5:00",
      section: "Trust Center & Close",
      script: "[Navigate to Trust Center] Finally, our Trust Center. Every student and administrator can see exactly what we collect, how long we retain it, and how to request deletion. This is radical transparency. This is HumanFirst. Questions?"
    }
  ];

  const objections = [
    {
      question: "How do you actually prevent cheating without surveillance?",
      answer: "We focus on blocking the most common cheating vector today—AI assistants like ChatGPT—while detecting suspicious behavior patterns like repeated focus changes. Research shows that transparent, trust-based approaches are as effective as surveillance, without the psychological harm. We're not trying to catch every possible form of cheating; we're making the honest path easier than the dishonest one.",
      category: "Product"
    },
    {
      question: "What if students just use their phones to access AI?",
      answer: "That's a limitation we're transparent about. However, our approach is about raising the barrier and creating clear expectations, not achieving perfect enforcement. Multi-device cheating requires more effort and planning—which most opportunistic cheaters won't undertake. For high-stakes exams, institutions can still combine HumanFirst with controlled testing environments.",
      category: "Product"
    },
    {
      question: "Why would universities switch from established proctoring vendors?",
      answer: "Three reasons: student backlash, legal risk, and cost. Students are organizing against invasive proctoring—petitions, protests, opt-out demands. Universities face lawsuits over biometric data collection. And we're 70% cheaper. We've had universities reach out to us after student government resolutions against their current tools.",
      category: "Market"
    },
    {
      question: "What's your competitive moat? Couldn't Proctorio just add a 'privacy mode'?",
      answer: "Incumbents are architecturally committed to surveillance—their entire product, from data collection to AI analysis, is built on it. A 'privacy mode' would mean rebuilding from scratch and abandoning their core value proposition. More importantly, trust is our moat. Once you've recorded students' bedrooms and made false accusations, you can't easily rebuild that trust. First-mover advantage in ethical EdTech is real.",
      category: "Competition"
    },
    {
      question: "How do you acquire customers? EDU sales cycles are long.",
      answer: "Free pilots are our wedge. We offer 14-day, no-commitment pilots to academic integrity officers and progressive deans. During the pilot, we help them build internal buy-in with student government support and faculty testimonials. Our pilot-to-paid conversion target is 85% because we're not asking them to take a risk—we're proving value first.",
      category: "GTM"
    },
    {
      question: "What's the Pakistan market really like for EdTech?",
      answer: "Pakistan has 200+ universities serving 2M+ students, with growing digital infrastructure and increasing awareness of academic integrity challenges post-COVID. The advantage is lower competition—global proctoring vendors haven't heavily penetrated this market yet, and there's genuine appetite for homegrown solutions. We're building here first, then expanding to similar markets in South Asia and MENA.",
      category: "Market"
    },
    {
      question: "What's your current traction?",
      answer: "We have a functional MVP and are in active pilot discussions with 5 Pakistani universities including FAST-NUCES, COMSATS, and NUST. We've conducted user testing with 50+ students showing 94% satisfaction rates and zero privacy concerns. We're pre-revenue but have a clear path to first paying customers within 3 months of incubation support.",
      category: "Traction"
    },
    {
      question: "Why should NIC back this team?",
      answer: "We combine deep understanding of the education sector, technical capability to build the product, and genuine passion for this mission. We've experienced the problem firsthand as students. We're not building another surveillance tool with a privacy veneer—we fundamentally believe in a different approach. NIC's network and credibility in Pakistani academia would accelerate our pilot acquisition significantly.",
      category: "Team"
    },
    {
      question: "What if universities don't actually care about student privacy?",
      answer: "They're starting to care because students care. We're seeing student government resolutions against proctoring tools, op-eds in campus newspapers, and faculty pushback. This is a generational shift. Universities that get ahead of it will have competitive advantage in attracting privacy-conscious students. The question isn't whether this matters—it's when it becomes unavoidable.",
      category: "Market"
    },
    {
      question: "How do you handle regulatory compliance (FERPA, GDPR)?",
      answer: "By collecting minimal data, we have minimal compliance burden. We don't store biometrics, don't record video, don't log keystrokes. Our data retention is configurable and defaults to minimal periods. We provide evidence packs that institutions can include in their own compliance documentation. Less data = less risk.",
      category: "Product"
    }
  ];

  const nextSlide = () => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  const prevSlide = () => setCurrentSlide((prev) => Math.max(prev - 1, 0));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <img src={humanfirstLogo} alt="HumanFirst" className="w-8 h-8 object-contain" />
                <span className="font-semibold">HumanFirst</span>
              </Link>
              <Badge variant="outline" className="text-xs">NIC Pitch Deck</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/gtm">
                <Button variant="ghost" size="sm">GTM Strategy</Button>
              </Link>
              <Link to="/">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="deck" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="deck" className="gap-2">
              <FileText className="w-4 h-4" />
              Pitch Deck
            </TabsTrigger>
            <TabsTrigger value="demo" className="gap-2">
              <Play className="w-4 h-4" />
              Demo Script
            </TabsTrigger>
            <TabsTrigger value="objections" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Objection Handling
            </TabsTrigger>
          </TabsList>

          {/* Pitch Deck Tab */}
          <TabsContent value="deck">
            <div className="space-y-6">
              {/* Slide Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                        i === currentSlide
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {slides[currentSlide].duration}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={prevSlide} disabled={currentSlide === 0}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextSlide} disabled={currentSlide === slides.length - 1}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Slide Content */}
              <Card className="min-h-[500px]">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">Slide {currentSlide + 1} of {slides.length}</Badge>
                      <CardTitle className="text-2xl">{slides[currentSlide].title}</CardTitle>
                      <CardDescription className="text-lg">{slides[currentSlide].subtitle}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {slides[currentSlide].content}
                </CardContent>
              </Card>

              {/* Speaker Notes */}
              <Card className="bg-muted/30">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Speaker Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3">
                  <p className="text-sm text-muted-foreground italic">
                    {slides[currentSlide].speakerNotes}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Demo Script Tab */}
          <TabsContent value="demo">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Play className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>5-Minute Demo Walkthrough</CardTitle>
                      <CardDescription>Structured script for live product demonstration</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="space-y-4">
                {demoScript.map((section, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center font-bold text-primary">
                            {index + 1}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{section.section}</CardTitle>
                            <Badge variant="outline" className="mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              {section.time}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-line">{section.script}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold">Demo Tips</h4>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>• Have both admin and student views ready in separate tabs</li>
                        <li>• Pre-create a test exam policy before the demo</li>
                        <li>• Keep the Trust Center as your closing anchor</li>
                        <li>• Practice the transition between competitor screenshot and your product</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Objection Handling Tab */}
          <TabsContent value="objections">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <HelpCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Common Evaluator Questions</CardTitle>
                      <CardDescription>Prepared answers for NIC panel objections</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="flex flex-wrap gap-2 mb-4">
                {["All", "Product", "Market", "Competition", "GTM", "Traction", "Team"].map((cat) => (
                  <Badge key={cat} variant="outline" className="cursor-pointer hover:bg-muted">
                    {cat}
                  </Badge>
                ))}
              </div>

              <Accordion type="single" collapsible className="space-y-4">
                {objections.map((obj, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-start gap-3 text-left">
                        <Badge variant="secondary" className="shrink-0 mt-0.5">{obj.category}</Badge>
                        <span className="font-medium">{obj.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      <p className="text-muted-foreground pl-16">{obj.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <Card className="bg-warning/5 border-warning/20">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning mt-1" />
                    <div>
                      <h4 className="font-semibold">Tough Questions to Prepare For</h4>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>• "What happens when a well-funded competitor enters the privacy space?"</li>
                        <li>• "Can you prove that your approach actually reduces cheating?"</li>
                        <li>• "What if regulations require more invasive monitoring?"</li>
                        <li>• "How do you defend against students who want zero monitoring?"</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 HumanFirst. Pitch materials for NIC Islamabad incubation application.</p>
        </div>
      </footer>
    </div>
  );
};

export default PitchDeck;
