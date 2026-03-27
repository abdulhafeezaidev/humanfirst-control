import React, { useState } from 'react';
import { 
  FileText, Copy, Clock, Shield, GraduationCap, Code, 
  Beaker, BookOpen, Edit2, Check, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'exam' | 'quiz' | 'lab' | 'focus';
  duration: string;
  blockedCategories: string[];
  recommendedFor: string[];
  color: string;
}

interface PolicyTemplatesProps {
  onApplyTemplate?: (template: PolicyTemplate, customizations: {
    title: string;
    startTime: string;
    endTime: string;
  }) => void;
}

const PolicyTemplates: React.FC<PolicyTemplatesProps> = ({ onApplyTemplate }) => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<PolicyTemplate | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');

  const templates: PolicyTemplate[] = [
    {
      id: 'midterm-exam',
      name: 'Standard Midterm',
      description: 'Block AI tools and messaging during traditional exams',
      icon: GraduationCap,
      category: 'exam',
      duration: '2-3 hours',
      blockedCategories: ['AI Tools', 'Social Media', 'Messaging'],
      recommendedFor: ['Written exams', 'Multiple choice tests', 'Essay exams'],
      color: 'blue',
    },
    {
      id: 'final-exam',
      name: 'Final Examination',
      description: 'Comprehensive restrictions for high-stakes finals',
      icon: Shield,
      category: 'exam',
      duration: '3-4 hours',
      blockedCategories: ['AI Tools', 'Social Media', 'Messaging', 'Entertainment'],
      recommendedFor: ['Final exams', 'Comprehensive tests', 'Certification exams'],
      color: 'red',
    },
    {
      id: 'quick-quiz',
      name: 'Quick Quiz',
      description: 'Light restrictions for short assessments',
      icon: Clock,
      category: 'quiz',
      duration: '15-30 min',
      blockedCategories: ['AI Tools'],
      recommendedFor: ['Pop quizzes', 'Weekly tests', 'Reading checks'],
      color: 'green',
    },
    {
      id: 'coding-exam',
      name: 'Programming Exam',
      description: 'Block AI coding assistants, allow documentation',
      icon: Code,
      category: 'exam',
      duration: '2-3 hours',
      blockedCategories: ['AI Tools', 'Messaging'],
      recommendedFor: ['Coding tests', 'Algorithm exams', 'Technical interviews'],
      color: 'purple',
    },
    {
      id: 'lab-practical',
      name: 'Lab Practical',
      description: 'Allow reference materials, block communication',
      icon: Beaker,
      category: 'lab',
      duration: '1-2 hours',
      blockedCategories: ['Social Media', 'Messaging'],
      recommendedFor: ['Science labs', 'Practicals', 'Skills assessments'],
      color: 'orange',
    },
    {
      id: 'focus-session',
      name: 'Focus Session',
      description: 'Encourage focus during study or work time',
      icon: BookOpen,
      category: 'focus',
      duration: '1-2 hours',
      blockedCategories: ['Social Media', 'Entertainment', 'Gaming'],
      recommendedFor: ['Study halls', 'Library sessions', 'Writing time'],
      color: 'teal',
    },
  ];

  const getCategoryBadge = (category: PolicyTemplate['category']) => {
    const styles = {
      exam: 'bg-blue-100 text-blue-700 border-blue-200',
      quiz: 'bg-green-100 text-green-700 border-green-200',
      lab: 'bg-orange-100 text-orange-700 border-orange-200',
      focus: 'bg-teal-100 text-teal-700 border-teal-200',
    };
    return styles[category];
  };

  const handleSelectTemplate = (template: PolicyTemplate) => {
    setSelectedTemplate(template);
    setCustomTitle(template.name);
    
    // Set default times (next weekday, 9am-12pm)
    const now = new Date();
    now.setDate(now.getDate() + 1);
    now.setHours(9, 0, 0, 0);
    setCustomStartTime(now.toISOString().slice(0, 16));
    
    const endTime = new Date(now);
    endTime.setHours(12, 0, 0, 0);
    setCustomEndTime(endTime.toISOString().slice(0, 16));
  };

  const handleApply = () => {
    if (!selectedTemplate || !customTitle || !customStartTime || !customEndTime) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    onApplyTemplate?.(selectedTemplate, {
      title: customTitle,
      startTime: customStartTime,
      endTime: customEndTime,
    });

    toast({
      title: 'Template applied',
      description: `Created policy "${customTitle}" from template.`,
    });

    setSelectedTemplate(null);
    setCustomTitle('');
    setCustomStartTime('');
    setCustomEndTime('');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Policy Templates</CardTitle>
              <CardDescription>
                Quick-start templates for common exam scenarios
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const IconComponent = template.icon;
              
              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="text-left p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${template.color}-100 dark:bg-${template.color}-900/30`}>
                      <IconComponent className={`w-5 h-5 text-${template.color}-600`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {template.name}
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={getCategoryBadge(template.category)}>
                          {template.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {template.duration}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Customization Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Customize Template
            </DialogTitle>
            <DialogDescription>
              Customize the "{selectedTemplate?.name}" template for your needs
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              {/* Template Info */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Blocked Categories</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedTemplate.blockedCategories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Customization Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="policyTitle">Policy Title</Label>
                  <Input
                    id="policyTitle"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g., Math 101 Midterm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Recommended For */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Recommended for</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {selectedTemplate.recommendedFor.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              <Copy className="w-4 h-4 mr-2" />
              Create Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PolicyTemplates;
