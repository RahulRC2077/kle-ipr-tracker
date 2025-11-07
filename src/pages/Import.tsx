import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/lib/auth';
import { importExcelFile, importFromPublicFile } from '@/lib/excel-import';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, Download, LogOut, User, Home, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function Import() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ patents: 0, users: 0, payments: 0 });
  const user = authService.getCurrentUser();

  useEffect(() => {
    if (!authService.isAuthenticated() || !authService.isAdmin()) {
      navigate('/dashboard');
      return;
    }

    loadStats();
  }, [navigate]);

  const loadStats = async () => {
    const patentCount = await db.patents.count();
    const userCount = await db.users.count();
    const paymentCount = await db.renewal_payments.count();
    setStats({ patents: patentCount, users: userCount, payments: paymentCount });
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await importExcelFile(file);
      
      if (result.success) {
        toast.success(`Successfully imported ${result.imported} patents`);
        if (result.errors.length > 0) {
          console.warn('Import warnings:', result.errors);
        }
        loadStats();
      } else {
        toast.error('Import failed: ' + result.errors.join(', '));
      }
    } catch (error) {
      toast.error('Import failed');
      console.error(error);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleReimportDefault = async () => {
    setLoading(true);
    try {
      const result = await importFromPublicFile();
      
      if (result.success) {
        toast.success(`Re-imported ${result.imported} patents from default file`);
        loadStats();
      } else {
        toast.error('Re-import failed: ' + result.errors.join(', '));
      }
    } catch (error) {
      toast.error('Re-import failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportDatabase = async () => {
    try {
      const allPatents = await db.patents.toArray();
      
      const exportData = allPatents.map(p => ({
        'Application Number': p.application_number,
        'Title': p.title,
        'Inventors': p.inventors,
        'Applicants': p.applicants,
        'Filed Date': p.filed_date || '',
        'Published Date': p.published_date || '',
        'Granted Date': p.granted_date || '',
        'Status': p.status,
        'Patent Number': p.patent_number || '',
        'Renewal Due Date': p.renewal_due_date || '',
        'Renewal Fee': p.renewal_fee || '',
        'Google Drive Link': p.google_drive_link || '',
        'IP India URL': p.ipindia_status_url || '',
        'Last Checked': p.last_checked || '',
        'Created At': p.created_at,
        'Updated At': p.updated_at
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Patents');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      XLSX.writeFile(wb, `KLE-IPR_full_export_${timestamp}.xlsx`);
      
      toast.success('Database exported successfully');
    } catch (error) {
      toast.error('Export failed');
      console.error(error);
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
      return;
    }

    try {
      await db.patents.clear();
      await db.renewal_payments.clear();
      await db.change_logs.clear();
      
      toast.success('Database cleared');
      loadStats();
    } catch (error) {
      toast.error('Failed to clear database');
      console.error(error);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Import & Export</h1>
              <p className="text-sm text-muted-foreground">Manage database data</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{user?.username}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Patents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.patents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.users}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.payments}</p>
            </CardContent>
          </Card>
        </div>

        {/* Import Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Data
            </CardTitle>
            <CardDescription>
              Import patents from Excel file. Existing patents with the same application number will be updated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload an Excel file (.xlsx) with patent data
              </p>
              <label htmlFor="file-upload">
                <Button variant="outline" disabled={loading} asChild>
                  <span>
                    {loading ? 'Importing...' : 'Choose File'}
                  </span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileImport}
                className="hidden"
                disabled={loading}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleReimportDefault}
                disabled={loading}
                variant="secondary"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-import Default File
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Data
            </CardTitle>
            <CardDescription>
              Export the entire database to Excel format for backup or analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExportDatabase} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Export Full Database
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-danger">
          <CardHeader>
            <CardTitle className="text-danger">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions. Use with extreme caution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleClearDatabase}
              variant="destructive"
              className="w-full"
            >
              Clear All Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
