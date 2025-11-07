import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Patent } from '@/lib/db';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  LogOut, 
  User, 
  Search,
  ExternalLink,
  AlertTriangle,
  Home,
  Download
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { PatentDetailDialog } from '@/components/PatentDetailDialog';
import * as XLSX from 'xlsx';

export default function Patents() {
  const navigate = useNavigate();
  const [patents, setPatents] = useState<Patent[]>([]);
  const [filteredPatents, setFilteredPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPatent, setSelectedPatent] = useState<Patent | null>(null);
  const user = authService.getCurrentUser();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/');
      return;
    }

    loadData();
  }, [navigate]);

  useEffect(() => {
    filterPatents();
  }, [patents, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      const allPatents = await db.patents.orderBy('filed_date').reverse().toArray();
      setPatents(allPatents);
    } catch (error) {
      console.error('Error loading patents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPatents = () => {
    let filtered = [...patents];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.application_number.toLowerCase().includes(term) ||
        p.title.toLowerCase().includes(term) ||
        p.inventors.toLowerCase().includes(term) ||
        p.applicants.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status.toLowerCase().includes(statusFilter.toLowerCase()));
    }

    setFilteredPatents(filtered);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const getRenewalAlert = (renewalDate: string | null) => {
    if (!renewalDate) return null;
    
    const today = new Date();
    const dueDate = new Date(renewalDate);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <AlertTriangle className="w-4 h-4 text-danger" />;
    }
    if (diffDays <= 7) {
      return <AlertTriangle className="w-4 h-4 text-danger" />;
    }
    if (diffDays <= 30) {
      return <AlertTriangle className="w-4 h-4 text-warning" />;
    }
    return null;
  };

  const exportToCSV = () => {
    const exportData = filteredPatents.map(p => ({
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
      'Google Drive Link': p.google_drive_link || '',
      'IP India URL': p.ipindia_status_url || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Patents');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    XLSX.writeFile(wb, `KLE-IPR_export_${timestamp}.xlsx`);
  };

  const uniqueStatuses = Array.from(new Set(patents.map(p => p.status)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading patents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Patent Database</h1>
              <p className="text-sm text-muted-foreground">{filteredPatents.length} of {patents.length} patents</p>
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

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by application number, title, inventors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Application No</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Filed Date</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatents.map((patent) => (
                <TableRow 
                  key={patent.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setSelectedPatent(patent)}
                >
                  <TableCell>
                    {getRenewalAlert(patent.renewal_due_date)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {patent.application_number}
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {patent.title}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={patent.status} />
                  </TableCell>
                  <TableCell>{patent.filed_date || 'N/A'}</TableCell>
                  <TableCell>
                    {patent.renewal_due_date || 'N/A'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {patent.applicants}
                  </TableCell>
                  <TableCell>
                    {patent.google_drive_link && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(patent.google_drive_link!, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredPatents.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No patents found matching your filters
            </div>
          )}
        </Card>
      </div>

      {/* Patent Detail Dialog */}
      {selectedPatent && (
        <PatentDetailDialog
          patent={selectedPatent}
          open={!!selectedPatent}
          onClose={() => setSelectedPatent(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
