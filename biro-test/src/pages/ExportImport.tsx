import React, { useState, useRef } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportStore, importStore } from '@/lib/storage';
import { ExamStore } from '@/types/exam';
import { toast } from 'sonner';
import { Download, Upload, FileJson, AlertCircle, CheckCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function ExportImport() {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const store = exportStore();
      const dataStr = JSON.stringify(store, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `jee-cbt-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please select a JSON file');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExamStore;

      // Validate structure
      if (!data.tests || !Array.isArray(data.tests)) {
        throw new Error('Invalid data structure');
      }

      importStore(data);
      setImportStatus('success');
      toast.success(`Imported ${data.tests.length} tests, ${data.results?.length || 0} results`);
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('error');
      toast.error('Failed to import data. Invalid file format.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Export / Import"
        description="Backup your data or restore from a previous backup"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Export Data
            </CardTitle>
            <CardDescription>
              Download all your tests, results, and mistake book as a JSON file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">What's included:</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                <li>• All created tests and questions</li>
                <li>• Test attempt history and results</li>
                <li>• Mistake book entries</li>
                <li>• Weekly study plans</li>
              </ul>
            </div>

            <Button onClick={handleExport} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Download Backup
            </Button>
          </CardContent>
        </Card>

        {/* Import Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Import Data
            </CardTitle>
            <CardDescription>
              Restore from a previously exported backup file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-review/10 border border-review/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-review" />
                <span className="font-medium text-review">Warning</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Importing will replace your current data. Make sure to export a backup first if
                needed.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Upload className="h-4 w-4" />
                  Import Backup
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Import Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will replace all your current tests, results, and mistake book entries
                    with the imported data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleImportClick}>
                    Continue Import
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {importStatus !== 'idle' && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  importStatus === 'success'
                    ? 'bg-correct/10 text-correct'
                    : 'bg-incorrect/10 text-incorrect'
                }`}
              >
                {importStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Data imported successfully!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Import failed. Check file format.</span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
