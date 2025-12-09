// src/pages/Patents.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Download,
  Trash2,
  Edit
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { PatentDetailDialog } from '@/components/PatentDetailDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';

export default function Patents() {
  const navigate = useNavigate();
  const location = useLocation();
  const [patents, setPatents] = useState<Patent[]>([]);
  const [filteredPatents, setFilteredPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPatent, setSelectedPatent] = useState<Patent | null>(null);
  const [editPatent, setEditPatent] = useState<Patent | null>(null);

  // date filters
  const [dateField, setDateField] = useState<'filed_date' | 'renewal_due_date'>('filed_date');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [yearOnly, setYearOnly] = useState<string>('');

  // renewal table dialog
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);

  const user = authService.getCurrentUser();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterPatents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patents, searchTerm, statusFilter, location.search, fromDate, toDate, dateField, yearOnly]);

  const loadData = async () => {
    try {
      const allPatents = await db.patents.toArray();

      allPatents.sort((a, b) => {
        const dateA = a.filed_date ? new Date(a.filed_date).getTime() : 0;
        const dateB = b.filed_date ? new Date(b.filed_date).getTime() : 0;
        return dateB - dateA;
      });

      setPatents(allPatents);
    } catch (error) {
      console.error('Error loading patents:', error);
    } finally {
      setLoading(false);
    }
  };

  const safeParseYMD = (raw?: string | null) => {
    if (!raw) return null;
    // handle strings like "YYYY-MM-DD" (most of your app uses that)
    // create date at midnight local by appending T00:00:00 if needed
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const d = new Date(raw + 'T00:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
    return null;
  };
  
  
  const filterPatents = () => {
    let filtered = [...patents];

    const params = new URLSearchParams(location.search);
    const dueParam = params.get('due');

    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize

    // dashboard due filters (30/60/90/overdue)
    if (dueParam) {
      filtered = filtered.filter((p) => {
        const raw = p.renewal_due_date;
        const due = safeParseYMD(raw);
        if (!due) return false;
        due.setHours(0, 0, 0, 0);
        if (dueParam === 'overdue') return due.getTime() < today.getTime();
        const days = parseInt(dueParam, 10);
        if (isNaN(days)) return false;
        const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff > 0 && diff <= days;
      });
    }

    // date range / year filter on chosen dateField
    if (fromDate || toDate || yearOnly) {
      filtered = filtered.filter((p) => {
        const raw = dateField === 'filed_date' ? p.filed_date : p.renewal_due_date;
        const d = safeParseYMD(raw);
        if (!d) return false;
        d.setHours(0, 0, 0, 0);

        if (yearOnly) {
          const y = parseInt(yearOnly, 10);
          if (isNaN(y)) return false;
          return d.getFullYear() === y;
        }

        if (fromDate && toDate) {
          const f = safeParseYMD(fromDate);
          const t = safeParseYMD(toDate);
          if (!f || !t) return false;
          f.setHours(0, 0, 0, 0);
          t.setHours(0, 0, 0, 0);
          return d.getTime() >= f.getTime() && d.getTime() <= t.getTime();
        }

        if (fromDate) {
          const f = safeParseYMD(fromDate);
          if (!f) return false;
          f.setHours(0, 0, 0, 0);
          return d.getTime() >= f.getTime();
        }

        if (toDate) {
          const t = safeParseYMD(toDate);
          if (!t) return false;
          t.setHours(0, 0, 0, 0);
          return d.getTime() <= t.getTime();
        }

        return true;
      });
    }

    // text search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        return (
          p.application_number?.toLowerCase().includes(term) ||
          p.title?.toLowerCase().includes(term) ||
          p.inventors?.toLowerCase().includes(term) ||
          p.applicants?.toLowerCase().includes(term)
        );
      });
    }

    // status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status?.trim().toLowerCase() === statusFilter.trim().toLowerCase());
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
    today.setHours(0, 0, 0, 0);
    const due = safeParseYMD(renewalDate);
    if (!due) return null;
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays <= 7) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (diffDays <= 30) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return null;
  };

  const exportToCSV = (items: Patent[]) => {
    const exportData = items.map((p) => ({
      'Application Number': p.application_number,
      Title: p.title,
      Inventors: p.inventors,
      Applicants: p.applicants,
      'Filed Date': p.filed_date || '',
      'Published Date': p.published_date || '',
      'Granted Date': p.granted_date || '',
      Status: p.status,
      'Patent Number': p.patent_number || '',
      'Renewal Due Date': p.renewal_due_date || '',
      'Google Drive Link': p.google_drive_link || '',
      'IP India URL': p.ipindia_status_url || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Patents');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    XLSX.writeFile(wb, `KLE-IPR_export_${timestamp}.xlsx`);
  };
  
  const copyRenewalTableToClipboard = (renewals: Patent[]) => {
  if (!renewals.length) return;

  // Headers
  const headers = ['Application No', 'Title', 'Renewal Date', 'Applicants'];

  // Compute column widths
  const colWidths = headers.map((header, i) => {
    return Math.max(
      header.length,
      ...renewals.map((p) => {
        switch (i) {
          case 0: return p.application_number?.length || 0;
          case 1: return p.title?.length || 0;
          case 2: return p.renewal_due_date?.length || 0;
          case 3: return p.applicants?.length || 0;
          default: return 0;
        }
      })
    );
  });

  // Helper to pad strings
  const pad = (str: string, len: number) => str + ' '.repeat(len - str.length);

  // Build table
  const lines = [
    headers.map((h, i) => pad(h, colWidths[i])).join(' | '),
    headers.map((_, i) => '-'.repeat(colWidths[i])).join('-|-'),
    ...renewals.map((p) =>
      [
        pad(p.application_number || '', colWidths[0]),
        pad(p.title || '', colWidths[1]),
        pad(p.renewal_due_date || '', colWidths[2]),
        pad(p.applicants || '', colWidths[3]),
      ].join(' | ')
    )
  ];

  const tableText = lines.join('\n');

  navigator.clipboard.writeText(tableText).then(() => {
    alert('Renewal table copied to clipboard with formatting!');
  });
};
		
  const getDueWithin30 = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return patents.filter((p) => {
      const d = safeParseYMD(p.renewal_due_date || undefined);
      if (!d) return false;
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 && diff <= 30;
    });
  };

  const handleDelete = async (id: number) => {
    // only admins can delete; we removed the buttons for viewers but keep check
    if (!authService.isAdmin()) return;
    if (!confirm('Are you sure you want to permanently delete this patent? This action cannot be undone.')) return;
    await db.patents.delete(id);
    await loadData();
  };

  const uniqueStatuses = Array.from(new Set(patents.map((p) => p.status?.trim()))).filter(Boolean);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading patents...</p>
        </div>
      </div>
    );

  const due30Count = patents.reduce((acc, p) => {
    const d = safeParseYMD(p.renewal_due_date || undefined);
    if (!d) return acc;
    d.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return acc + (diff > 0 && diff <= 30 ? 1 : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Patent Database</h1>
              <p className="text-sm text-muted-foreground">
                {filteredPatents.length} of {patents.length} patents
              </p>
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
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by application number, title, inventors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>

            <div className="flex gap-2 items-center">
              <label className="text-sm">Date Field</label>
              <select value={dateField} onChange={(e) => setDateField(e.target.value as any)} className="px-2 py-1 border rounded">
                <option value="filed_date">Filed Date</option>
                <option value="renewal_due_date">Renewal Due Date</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Year</label>
              <Input type="number" placeholder="2025" value={yearOnly} onChange={(e) => setYearOnly(e.target.value)} className="w-24" />
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-md bg-background">
              <option value="all">All Statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <Button onClick={() => exportToCSV(filteredPatents)} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>

              <Button onClick={() => setShowRenewalDialog(true)} variant="secondary">
                Renewal List ({due30Count})
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Application No</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Filed Date</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredPatents.map((patent) => (
                <TableRow key={patent.id} className="hover:bg-accent/50">
                  <TableCell>{getRenewalAlert(patent.renewal_due_date)}</TableCell>

                  <TableCell className="font-mono text-sm cursor-pointer" onClick={() => setSelectedPatent(patent)}>
                    {patent.application_number}
                  </TableCell>

                  <TableCell className="max-w-md truncate cursor-pointer" onClick={() => setSelectedPatent(patent)}>
                    {patent.title}
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={patent.status} />
                  </TableCell>

                  <TableCell>{patent.filed_date || 'N/A'}</TableCell>
                  <TableCell>{patent.renewal_due_date || 'N/A'}</TableCell>

                  <TableCell className="max-w-xs truncate">{patent.applicants}</TableCell>

                  <TableCell className="flex gap-2">
                    {patent.google_drive_link && (
                      <Button variant="ghost" size="sm" onClick={() => window.open(patent.google_drive_link!, '_blank')}>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}

                    {authService.isAdmin() && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setEditPatent(patent)}>
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button variant="ghost" size="sm" onClick={() => handleDelete(patent.id!)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredPatents.length === 0 && <div className="text-center py-12 text-muted-foreground">No patents found matching your filters</div>}
        </Card>
      </div>

      {selectedPatent && <PatentDetailDialog patent={selectedPatent} open={!!selectedPatent} onClose={() => setSelectedPatent(null)} onUpdate={loadData} />}

      {editPatent && authService.isAdmin() && <PatentDetailDialog patent={editPatent} editMode open={!!editPatent} onClose={() => setEditPatent(null)} onUpdate={loadData} />}

      {/* Renewal dialog: shows table content for sending */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Renewals due within 30 days</DialogTitle>
          </DialogHeader>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application No</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Renewal Date</TableHead>
                  <TableHead>Applicants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getDueWithin30().map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.application_number}</TableCell>
                    <TableCell className="max-w-md truncate">{p.title}</TableCell>
                    <TableCell>{p.renewal_due_date}</TableCell>
                    <TableCell className="max-w-xs truncate">{p.applicants}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="flex gap-2">
            <Button onClick={() => exportToCSV(getDueWithin30())}>Export CSV</Button>
            <Button variant="ghost" onClick={() => setShowRenewalDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
