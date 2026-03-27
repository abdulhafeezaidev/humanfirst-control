/**
 * Data Export Page
 * 
 * Admin-only page for exporting all database data for migration.
 * Generates a ZIP file containing schema, data, auth users, and storage info.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Database, 
  Users, 
  HardDrive, 
  FileJson, 
  FileCode, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Shield,
  Clock,
  FileArchive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';

interface ExportData {
  exportedAt: string;
  exportedBy: string;
  organizationId: string | null;
  schema: string;
  readme: string;
  tables: Record<string, unknown[]>;
  authUsers: unknown[];
  storageObjects: unknown[];
}

type ExportStatus = 'idle' | 'confirming' | 'exporting' | 'processing' | 'complete' | 'error';

export default function DataExport() {
  const { user, role, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exportStats, setExportStats] = useState<{
    tables: number;
    rows: number;
    users: number;
    files: number;
  } | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, loading, navigate]);

  const handleConfirmExport = () => {
    setStatus('confirming');
    setError(null);
  };

  const handleCancelExport = () => {
    setStatus('idle');
  };

  const handleStartExport = async () => {
    setStatus('exporting');
    setProgress(10);
    setError(null);

    try {
      // Call the edge function
      setProgress(20);
      const { data, error: exportError } = await supabase.functions.invoke('data-export', {
        method: 'POST',
      });

      if (exportError) {
        throw new Error(exportError.message || 'Export failed');
      }

      const exportData = data as ExportData;
      setProgress(50);
      setStatus('processing');

      // Create ZIP file
      const zip = new JSZip();
      
      // Add schema.sql
      zip.file('schema.sql', exportData.schema);
      setProgress(55);

      // Add README
      zip.file('README_IMPORT.md', exportData.readme);
      setProgress(60);

      // Add table data
      const dataFolder = zip.folder('data');
      let totalRows = 0;
      
      for (const [tableName, tableData] of Object.entries(exportData.tables)) {
        if (Array.isArray(tableData)) {
          dataFolder?.file(`${tableName}.json`, JSON.stringify(tableData, null, 2));
          totalRows += tableData.length;
        }
      }
      setProgress(75);

      // Add auth users
      zip.file('auth_users.json', JSON.stringify(exportData.authUsers, null, 2));
      setProgress(80);

      // Add storage objects
      zip.file('storage_objects.json', JSON.stringify(exportData.storageObjects, null, 2));
      setProgress(85);

      // Add export metadata
      const metadata = {
        exportedAt: exportData.exportedAt,
        exportedBy: exportData.exportedBy,
        organizationId: exportData.organizationId,
        tableCount: Object.keys(exportData.tables).length,
        totalRows,
        authUsersCount: Array.isArray(exportData.authUsers) ? exportData.authUsers.length : 0,
        storageObjectsCount: Array.isArray(exportData.storageObjects) ? exportData.storageObjects.length : 0,
      };
      zip.file('export_metadata.json', JSON.stringify(metadata, null, 2));
      setProgress(90);

      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      setProgress(95);

      // Download ZIP
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `humanfirst-export-${timestamp}.zip`;
      
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);
      setStatus('complete');
      setExportStats({
        tables: Object.keys(exportData.tables).length,
        rows: totalRows,
        users: Array.isArray(exportData.authUsers) ? exportData.authUsers.length : 0,
        files: Array.isArray(exportData.storageObjects) ? exportData.storageObjects.length : 0,
      });

      toast({
        title: 'Export Complete',
        description: `Successfully exported ${totalRows} rows from ${Object.keys(exportData.tables).length} tables.`,
      });
    } catch (err: unknown) {
      console.error('Export error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setStatus('error');
      
      toast({
        title: 'Export Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const resetExport = () => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setExportStats(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Export</h1>
            <p className="text-muted-foreground mt-1">
              Export your complete database for migration to another Supabase project
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Admin Only
          </Badge>
        </div>

        {/* Security Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Security Notice</AlertTitle>
          <AlertDescription>
            This export contains sensitive data. The download will be logged for audit purposes. 
            Rate limit: 1 export per 10 minutes.
          </AlertDescription>
        </Alert>

        {/* Export Contents */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Schema</CardTitle>
              <FileCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Complete SQL schema with tables, indexes, constraints, and RLS setup
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Table Data</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                All rows from 15+ tables exported as JSON files
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auth Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                User accounts with emails, roles, and org mappings (no passwords)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Files</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                List of all storage bucket files with metadata
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Export Card */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="h-5 w-5" />
              Export Package
            </CardTitle>
            <CardDescription>
              Download a complete ZIP file containing schema, data, and import instructions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Idle State */}
            {status === 'idle' && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium">Package Contents:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <code>schema.sql</code> - Complete database schema
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <code>data/*.json</code> - All table data
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <code>auth_users.json</code> - User accounts
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <code>storage_objects.json</code> - File list
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <code>README_IMPORT.md</code> - Import guide
                    </li>
                  </ul>
                </div>

                <Button onClick={handleConfirmExport} className="w-full" size="lg">
                  <Download className="mr-2 h-5 w-5" />
                  Start Export
                </Button>
              </div>
            )}

            {/* Confirmation State */}
            {status === 'confirming' && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Confirm Data Export</AlertTitle>
                  <AlertDescription>
                    You are about to export all organization data. This action will be logged 
                    and you can only export once every 10 minutes. Are you sure you want to proceed?
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleCancelExport} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleStartExport} className="flex-1">
                    <Shield className="mr-2 h-4 w-4" />
                    Confirm & Export
                  </Button>
                </div>
              </div>
            )}

            {/* Exporting/Processing State */}
            {(status === 'exporting' || status === 'processing') && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-medium">
                    {status === 'exporting' ? 'Fetching data from database...' : 'Creating ZIP file...'}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {progress}% complete
                </p>
              </div>
            )}

            {/* Complete State */}
            {status === 'complete' && exportStats && (
              <div className="space-y-4">
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-700 dark:text-green-300">Export Complete!</AlertTitle>
                  <AlertDescription className="text-green-600 dark:text-green-400">
                    Your data has been exported and downloaded successfully.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <div className="text-2xl font-bold">{exportStats.tables}</div>
                    <div className="text-xs text-muted-foreground">Tables</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <div className="text-2xl font-bold">{exportStats.rows.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Rows</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <div className="text-2xl font-bold">{exportStats.users}</div>
                    <div className="text-xs text-muted-foreground">Users</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <div className="text-2xl font-bold">{exportStats.files}</div>
                    <div className="text-xs text-muted-foreground">Files</div>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetExport} className="flex-1">
                    <Clock className="mr-2 h-4 w-4" />
                    Export Again (10 min cooldown)
                  </Button>
                </div>
              </div>
            )}

            {/* Error State */}
            {status === 'error' && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Export Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>

                <Button onClick={resetExport} variant="outline" className="w-full">
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import Guide</CardTitle>
            <CardDescription>
              Steps to import your data into a new Supabase project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  1
                </span>
                <span>Create a new Supabase project at supabase.com</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  2
                </span>
                <span>Run <code className="px-1 bg-muted rounded">schema.sql</code> in the SQL Editor</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  3
                </span>
                <span>Import JSON files from the <code className="px-1 bg-muted rounded">data/</code> folder</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  4
                </span>
                <span>Re-invite users using the <code className="px-1 bg-muted rounded">auth_users.json</code> list</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  5
                </span>
                <span>Update your app's environment variables with the new project credentials</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
