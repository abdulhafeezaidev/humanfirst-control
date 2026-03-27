import React, { useState } from 'react';
import { 
  GraduationCap, CheckCircle, Circle, Play, BookOpen, Shield, 
  Users, FileText, BarChart3, AlertTriangle, ArrowRight, Lock,
  Clock, Award, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: React.ElementType;
  topics: string[];
  completed: boolean;
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
  };
}

interface AdminTrainingModuleProps {
  onComplete?: () => void;
  completedModules?: string[];
  onModuleComplete?: (moduleId: string) => void;
}

const AdminTrainingModule: React.FC<AdminTrainingModuleProps> = ({
  onComplete,
  completedModules = [],
  onModuleComplete
}) => {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});

  const modules: TrainingModule[] = [
    {
      id: 'ethics',
      title: 'Ethics & Privacy Foundation',
      description: 'Understanding HumanFirst\'s core ethical principles',
      duration: '10 min',
      icon: Shield,
      completed: completedModules.includes('ethics'),
      topics: [
        'The 6 core ethical constraints (No content reading, No keystroke logging, etc.)',
        'Why privacy-first matters in educational settings',
        'Difference between focus control and surveillance',
        'Student rights and administrator responsibilities',
        'How to communicate policies to students transparently',
      ],
      quiz: {
        question: 'Which of the following does HumanFirst NEVER do?',
        options: [
          'Block access to AI services during exams',
          'Log when a student switches tabs',
          'Record student keystrokes',
          'Show students when policies are active',
        ],
        correctIndex: 2,
      },
    },
    {
      id: 'policies',
      title: 'Policy Management',
      description: 'Creating and managing exam policies effectively',
      duration: '15 min',
      icon: FileText,
      completed: completedModules.includes('policies'),
      topics: [
        'Creating time-based exam policies',
        'Selecting appropriate category restrictions',
        'Scheduling policies in advance',
        'Activating and deactivating policies',
        'Understanding policy impact on students',
        'Best practices for policy communication',
      ],
      quiz: {
        question: 'When should you notify students about an upcoming exam policy?',
        options: [
          'At the moment the policy becomes active',
          'At least 24-48 hours in advance',
          'After the exam is complete',
          'Students don\'t need to be notified',
        ],
        correctIndex: 1,
      },
    },
    {
      id: 'pilot',
      title: 'Pilot Mode Operations',
      description: 'Running a successful pilot program',
      duration: '12 min',
      icon: BarChart3,
      completed: completedModules.includes('pilot'),
      topics: [
        'What Pilot Mode does vs. full enforcement',
        'Interpreting pilot metrics and compliance data',
        'When to transition from pilot to production',
        'Communicating pilot status to stakeholders',
        'Handling edge cases during pilot',
        'Weekly reporting and metric reviews',
      ],
      quiz: {
        question: 'In Pilot Mode, what happens when a student visits a blocked AI service?',
        options: [
          'They are immediately blocked',
          'Access is logged but not blocked',
          'They receive a warning message',
          'Nothing - pilot mode doesn\'t track anything',
        ],
        correctIndex: 1,
      },
    },
    {
      id: 'events',
      title: 'Understanding Focus Events',
      description: 'Interpreting tamper detection and focus signals',
      duration: '10 min',
      icon: AlertTriangle,
      completed: completedModules.includes('events'),
      topics: [
        'Types of focus events (backgrounded, focus loss, network)',
        'What events mean vs. what they DON\'T mean',
        'Grace periods and false positive prevention',
        'When to investigate vs. when to dismiss events',
        'Neutral language guidelines for event descriptions',
        'Device trust scoring overview',
      ],
      quiz: {
        question: 'An "app_backgrounded" event indicates:',
        options: [
          'The student was cheating',
          'The student switched to another application',
          'The browser tab was hidden for more than 3 seconds',
          'The student closed the exam application',
        ],
        correctIndex: 2,
      },
    },
    {
      id: 'students',
      title: 'Student Management',
      description: 'Onboarding students and managing consent',
      duration: '8 min',
      icon: Users,
      completed: completedModules.includes('students'),
      topics: [
        'Student onboarding flow overview',
        'Consent collection and ethics disclosure',
        'Device registration process',
        'Communicating with students about policies',
        'Handling student questions and concerns',
        'Student data rights and privacy requests',
      ],
      quiz: {
        question: 'Before a student can use HumanFirst, they must:',
        options: [
          'Install specialized monitoring software',
          'Accept the ethics disclosure and consent to data processing',
          'Provide access to their camera',
          'Share their browser history',
        ],
        correctIndex: 1,
      },
    },
  ];

  const completedCount = modules.filter(m => completedModules.includes(m.id)).length;
  const progressPercent = (completedCount / modules.length) * 100;
  const allCompleted = completedCount === modules.length;

  const handleQuizSubmit = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module?.quiz) return;

    const isCorrect = quizAnswers[moduleId] === module.quiz.correctIndex;
    setQuizSubmitted(prev => ({ ...prev, [moduleId]: true }));

    if (isCorrect && onModuleComplete) {
      onModuleComplete(moduleId);
    }
  };

  const isQuizCorrect = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    return module?.quiz && quizAnswers[moduleId] === module.quiz.correctIndex;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Administrator Training</CardTitle>
              <CardDescription>Complete all modules before managing policies</CardDescription>
            </div>
          </div>
          {allCompleted && (
            <Badge className="gap-1 bg-green-100 text-green-700 border-green-200">
              <Award className="w-3 h-3" />
              Certified
            </Badge>
          )}
        </div>
        
        {/* Progress */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount} of {modules.length} modules completed
            </span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {modules.map((module, index) => {
          const isCompleted = completedModules.includes(module.id);
          const isExpanded = expandedModule === module.id;
          const isLocked = index > 0 && !completedModules.includes(modules[index - 1].id);
          const ModuleIcon = module.icon;

          return (
            <div
              key={module.id}
              className={`border rounded-lg overflow-hidden transition-colors ${
                isCompleted 
                  ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' 
                  : isLocked 
                    ? 'border-muted bg-muted/30 opacity-60' 
                    : 'border-border hover:border-primary/50'
              }`}
            >
              {/* Module Header */}
              <button
                onClick={() => !isLocked && setExpandedModule(isExpanded ? null : module.id)}
                className="w-full p-4 flex items-center gap-4 text-left"
                disabled={isLocked}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-green-100 text-green-600' 
                    : isLocked 
                      ? 'bg-muted text-muted-foreground' 
                      : 'bg-primary/10 text-primary'
                }`}>
                  {isLocked ? (
                    <Lock className="w-5 h-5" />
                  ) : isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <ModuleIcon className="w-5 h-5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-foreground">{module.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {module.duration}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {module.description}
                  </p>
                </div>

                {!isLocked && (
                  isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )
                )}
              </button>

              {/* Module Content */}
              {isExpanded && !isLocked && (
                <div className="px-4 pb-4 pt-0 border-t">
                  <div className="pt-4 space-y-4">
                    {/* Topics */}
                    <div>
                      <h5 className="font-medium mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Topics Covered
                      </h5>
                      <ul className="space-y-1 ml-6">
                        {module.topics.map((topic, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <Circle className="w-2 h-2 mt-1.5 flex-shrink-0 fill-current" />
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Quiz */}
                    {module.quiz && (
                      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <h5 className="font-medium">Knowledge Check</h5>
                        <p className="text-sm">{module.quiz.question}</p>
                        <div className="space-y-2">
                          {module.quiz.options.map((option, i) => {
                            const isSelected = quizAnswers[module.id] === i;
                            const isSubmitted = quizSubmitted[module.id];
                            const isCorrectOption = i === module.quiz!.correctIndex;
                            
                            return (
                              <button
                                key={i}
                                onClick={() => !isSubmitted && setQuizAnswers(prev => ({ ...prev, [module.id]: i }))}
                                disabled={isSubmitted}
                                className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                                  isSubmitted
                                    ? isCorrectOption
                                      ? 'bg-green-100 border-green-300 text-green-800'
                                      : isSelected
                                        ? 'bg-red-100 border-red-300 text-red-800'
                                        : 'bg-muted border-muted'
                                    : isSelected
                                      ? 'bg-primary/10 border-primary'
                                      : 'hover:bg-muted border-border'
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                        
                        {!quizSubmitted[module.id] ? (
                          <Button
                            onClick={() => handleQuizSubmit(module.id)}
                            disabled={quizAnswers[module.id] === undefined}
                            size="sm"
                          >
                            Submit Answer
                          </Button>
                        ) : (
                          <p className={`text-sm font-medium ${
                            isQuizCorrect(module.id) ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isQuizCorrect(module.id) 
                              ? '✓ Correct! Module completed.' 
                              : '✗ Incorrect. Please review the topics and try again.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Complete Button */}
        {allCompleted && onComplete && (
          <Button onClick={onComplete} className="w-full" size="lg">
            Continue to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminTrainingModule;
