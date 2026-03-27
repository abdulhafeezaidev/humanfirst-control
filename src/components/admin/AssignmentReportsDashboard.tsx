/**
 * Assignment Integrity Reports Dashboard
 * 
 * Teacher/Admin view for reviewing student integrity reports.
 * Shows all students who took assignments with verdicts and quick summaries.
 * Clicking a row opens the full human-readable report.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Download,
  Eye,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface StudentAssignmentRecord {
  student_id: string;
  student_name: string;
  submitted: boolean;
  submitted_at?: string;
  verdict?: 'Clean' | 'Suspicious' | 'High Risk';
  quick_summary?: string;
  loading?: boolean;
}

interface DetailedReport {
  student_name: string;
  assignment_name: string;
  session_date: string;
  submitted: boolean;
  submitted_at: string | null;
  session_duration_minutes: number;
  verdict: 'Clean' | 'Suspicious' | 'High Risk';
  violations: string[];
  plain_summary: string;
  risk_score: number;
}

interface AssignmentReportsDashboardProps {
  assignmentId: string;
  assignmentTitle: string;
  organizationId: string;
}

export function AssignmentReportsDashboard({
  assignmentId,
  assignmentTitle,
  organizationId,
}: AssignmentReportsDashboardProps) {
  const [records, setRecords] = useState<StudentAssignmentRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<DetailedReport | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load policy assignments for this assignment
  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get policies for this assignment
      const policiesResult: any = await (supabase as any)
        .from('exam_policies')
        .select('id')
        .eq('assignment_id', assignmentId)
        .eq('organization_id', organizationId);
      
      const { data: policies, error: policiesError } = policiesResult;

      if (policiesError) throw policiesError;
      if (!policies || policies.length === 0) {
        setRecords([]);
        return;
      }

      const policyIds = policies.map((p) => p.id);

      // Get student sessions for this assignment
      const { data: sessions, error: sessionsError } = await (supabase
        .from('assignment_sessions' as any)
        .select('student_id, submitted_at')
        .eq('assignment_id', assignmentId) as any);

      if (sessionsError) throw sessionsError;

      // Get unique student IDs from sessions
      const studentIds = Array.from(new Set(sessions?.map((s: any) => s.student_id) || [])) as string[];

      // Get student profiles
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      // Build initial records
      const initialRecords: StudentAssignmentRecord[] = (students || []).map(
        (student) => {
          const session = sessions?.find((s) => s.student_id === student.id);
          return {
            student_id: student.id,
            student_name: student.full_name || 'Unknown Student',
            submitted: !!session?.submitted_at,
            submitted_at: session?.submitted_at,
            loading: true,
          };
        },
      );

      setRecords(initialRecords);

      // Load reports for each student (parallel)
      const reports = await Promise.allSettled(
        policyIds.flatMap((policyId) =>
          initialRecords.map(async (record) => ({
            student_id: record.student_id,
            policy_id: policyId,
          })),
        ),
      );

      // Call generate-integrity-report for each student+policy combination
      const reportDataMap = new Map<string, DetailedReport>();

      await Promise.allSettled(
        policyIds.flatMap((policyId) =>
          initialRecords.map(async (record) => {
            try {
              const res = await supabase.functions.invoke('generate-integrity-report', {
                body: {
                  student_id: record.student_id,
                  policy_id: policyId,
                },
              });

              if (res.data) {
                const key = `${record.student_id}_${policyId}`;
                reportDataMap.set(key, res.data);
              }
            } catch (err) {
              console.warn(`Failed to generate report for ${record.student_id}:`, err);
            }
          }),
        ),
      );

      // Update records with verdict data
      const updatedRecords = initialRecords.map((record) => {
        // Get the first report for this student (any policy)
        let report: DetailedReport | undefined;
        for (const policyId of policyIds) {
          const key = `${record.student_id}_${policyId}`;
          report = reportDataMap.get(key);
          if (report) break;
        }

        return {
          ...record,
          verdict: report?.verdict,
          quick_summary: report
            ? `${report.violations.length === 0 ? 'No violations' : `${report.violations.length} violation${report.violations.length !== 1 ? 's' : ''}`}`
            : 'Report unavailable',
          loading: false,
        };
      });

      setRecords(updatedRecords.sort((a, b) => a.student_name.localeCompare(b.student_name)));
    } catch (err: any) {
      setError(err?.message || 'Failed to load reports');
      toast({
        title: 'Error',
        description: err?.message || 'Failed to load integrity reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [assignmentId, organizationId, toast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleViewReport = useCallback(
    async (record: StudentAssignmentRecord) => {
      try {
        // Get the policy for this assignment
        const policiesResult: any = await (supabase as any)
          .from('exam_policies')
          .select('id')
          .eq('assignment_id', assignmentId)
          .eq('organization_id', organizationId)
          .limit(1)
          .single();
        
        const { data: policies } = policiesResult;

        if (!policies) {
          toast({
            title: 'Error',
            description: 'Could not find policy for this assignment',
            variant: 'destructive',
          });
          return;
        }

        // Generate detailed report
        const res = await supabase.functions.invoke('generate-integrity-report', {
          body: {
            student_id: record.student_id,
            policy_id: policies.id,
          },
        });

        if (res.data) {
          setSelectedReport(res.data);
          setShowDetailDialog(true);
        }
      } catch (err: any) {
        toast({
          title: 'Error',
          description: 'Failed to load detailed report',
          variant: 'destructive',
        });
      }
    },
    [assignmentId, organizationId, toast],
  );

  const handleExportPDF = useCallback(async () => {
    // Placeholder for PDF export functionality
    toast({
      title: 'PDF Export',
      description: 'Export to PDF coming soon',
    });
  }, [toast]);

  const getVerdictIcon = (verdict?: string) => {
    switch (verdict) {
      case 'Clean':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'Suspicious':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'High Risk':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading integrity reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm font-semibold text-destructive">{error}</p>
        <Button onClick={loadReports} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Assignment Reports</h3>
          <p className="text-sm text-muted-foreground">{assignmentTitle}</p>
        </div>
        <Button onClick={handleExportPDF} className="gap-2" disabled={records.length === 0}>
          <Download className="h-4 w-4" />
          Export All
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="text-center">Submitted</TableHead>
              <TableHead className="text-center">Verdict</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No student records found for this assignment
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.student_id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{record.student_name}</TableCell>
                  <TableCell className="flex justify-center">
                    {record.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : record.submitted ? (
                      <div className="flex flex-col items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-muted-foreground">
                          {record.submitted_at
                            ? new Date(record.submitted_at).toLocaleTimeString(
                                'en-US',
                                { hour: '2-digit', minute: '2-digit' },
                              )
                            : ''}
                        </span>
                      </div>
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </TableCell>
                  <TableCell className="flex justify-center">
                    {record.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <div className="flex items-center gap-2">
                        {getVerdictIcon(record.verdict)}
                        <span className="text-sm font-medium">{record.verdict || '—'}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record.quick_summary}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewReport(record)}
                      disabled={record.loading}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detailed Report Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Integrity Report</DialogTitle>
            <DialogDescription>
              Complete behavioral analysis for {selectedReport?.student_name}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Student</p>
                  <p className="text-sm font-semibold">{selectedReport.student_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Session Date</p>
                  <p className="text-sm font-semibold">{selectedReport.session_date}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Duration</p>
                  <p className="text-sm font-semibold">
                    {selectedReport.session_duration_minutes} minutes
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Risk Score</p>
                  <p className="text-sm font-semibold">{selectedReport.risk_score}/20</p>
                </div>
              </div>

              {/* Verdict Badge */}
              <div className="flex items-center gap-3 rounded-lg border p-4">
                {getVerdictIcon(selectedReport.verdict)}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Verdict</p>
                  <p className="text-lg font-bold">{selectedReport.verdict}</p>
                </div>
              </div>

              {/* Violations */}
              {selectedReport.violations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">VIOLATIONS DETECTED</p>
                  <ul className="space-y-2">
                    {selectedReport.violations.map((violation, i) => (
                      <li
                        key={i}
                        className="flex gap-3 rounded-lg bg-red-50 p-3 text-sm dark:bg-red-950/20"
                      >
                        <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
                        <span>{violation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Plain Summary */}
              <div className="space-y-2 rounded-lg bg-slate-50 p-4 dark:bg-slate-900/20">
                <p className="text-xs font-medium text-muted-foreground">SUMMARY</p>
                <p className="text-sm leading-relaxed">{selectedReport.plain_summary}</p>
              </div>

              {/* Ethical Disclaimer */}
              <div className="text-xs italic text-muted-foreground">
                This report contains behavioral signals only. Final academic judgment remains with
                the instructor.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AssignmentReportsDashboard;
