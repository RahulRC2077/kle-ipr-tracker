import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Patent } from '@/lib/db';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  LogOut,
  User,
  Calendar,
  Plus
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Dashboard() {
  const navigate = useNavigate();
  const [patents, setPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPatent, setNewPatent] = useState<Partial<Patent>>({});
  const user = authService.getCurrentUser();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/');
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const allPatents = await db.patents.toArray();

      const cleanedPatents = allPatents.map(p => ({
        ...p,
        status: p.status ? p.status.replace(/^"|"$/g, '').trim() : ''
      }));

      setPatents(cleanedPatents);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const handleSavePatent = async () => {
    if (!newPatent.application_number || !newPatent.title || !newPatent.status) {
      alert('Application number, Title, and Status are required');
      return;
    }
    const now = new Date().toISOString();
    const patentToSave: Patent = {
      ...newPatent,
      id: undefined,
      inventors: newPatent.inventors || '',
      applicants: newPatent.applicants || '',
      filed_date: newPatent.filed_date || null,
      published_date: newPatent.published_date || null,
      granted_date: newPatent.granted_date || null,
      renewal_due_date: newPatent.renewal_due_date || null,
      renewal_fee: newPatent.renewal_fee || null,
      last_checked: null,
      ipindia_status_url: newPatent.ipindia_status_url || null,
      google_drive_link: newPatent.google_drive_link || null,
      patent_number: newPatent.patent_number || null,
      patent_certificate: newPatent.patent_certificate || null,
      raw_metadata: newPatent.raw_metadata || {},
      created_at: now,
      updated_at: now,
      status: newPatent.status
    };

    await db.patents.add(patentToSave);
    setShowAddDialog(false);
    setNewPatent({});
    loadData();
  };

  // STATS
  const totalPatents = patents.length;
  const grantedPatents = patents.filter(p => p.status.toLowerCase().includes('granted')).length;

  const underExaminationStatuses = ['ae', 'acs', 'rf-aae', 'examination', 'ar', 'arfe'];
  const underExamination = patents.filter(p =>
    underExaminationStatuses.includes(p.status.trim().toLowerCase())
  ).length;

  const abandonedPatents = patents.filter(p =>
    p.status.toLowerCase().includes('abandoned') ||
    p.status.toLowerCase().includes('ceased') ||
    p.status.toLowerCase().includes('expired')
  ).length;

  // RENEWALS (FIXED)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // normalize today

  let due30 = 0, due60 = 0, due90 = 0;
  patents.forEach(p => {
    if (!p.renewal_due_date) return;

    const dueDate = new Date(p.renewal_due_date);
    if (isNaN(dueDate.getTime())) return; // skip invalid dates

    dueDate.setHours(0, 0, 0, 0); // normalize
    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && diffDays <= 30) due30++;
    else if (diffDays > 30 && diffDays <= 60) due60++;
    else if (diffDays > 60 && diffDays <= 90) due90++;
  });

  const renewalsDue30 = due30;
  const renewalsDue60 = due60;
  const renewalsDue90 = due90;

  const recentPatents = patents
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">KLE-IPR Patent Tracker</h1>
              <p className="text-sm text-muted-foreground">Patent Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{user?.username}</span>
              <span className="text-xs text-muted-foreground">({user?.role})</span>
            </div>

            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">

        {/* STAT CARDS */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Patents</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPatents}</div>
              <p className="text-xs text-muted-foreground mt-1">All applications tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Granted</CardTitle>
              <CheckCircle className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{grantedPatents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalPatents ? ((grantedPatents / totalPatents) * 100).toFixed(1) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Under Examination</CardTitle>
              <Clock className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{underExamination}</div>
              <p className="text-xs text-muted-foreground mt-1">In review process</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Abandoned/Ceased</CardTitle>
              <XCircle className="w-4 h-4 text-danger" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-danger">{abandonedPatents}</div>
              <p className="text-xs text-muted-foreground mt-1">No longer active</p>
            </CardContent>
          </Card>
        </div>

        {/* RENEWALS CARDS */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card 
            className="border-warning/50 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate('/patents?due=30')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Due in 30 Days</CardTitle>
              <AlertTriangle className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{renewalsDue30}</div>
              <p className="text-xs text-muted-foreground mt-1">Urgent attention needed</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate('/patents?due=60')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Due in 60 Days</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{renewalsDue60}</div>
              <p className="text-xs text-muted-foreground mt-1">Plan ahead</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate('/patents?due=90')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Due in 90 Days</CardTitle>
              <span className="text-muted-foreground font-semibold text-lg">₹</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{renewalsDue90}</div>
              <p className="text-xs text-muted-foreground mt-1">Budget planning</p>
            </CardContent>
          </Card>
        </div>

        {/* RECENT PATENTS LIST */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Patents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPatents.map((patent) => (
                <div
                  key={patent.id}
                  className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{patent.title}</h3>
                      <StatusBadge status={patent.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {patent.application_number} • {patent.applicants}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Filed: {patent.filed_date || 'N/A'}
                      {patent.renewal_due_date && ` • Renewal: ${patent.renewal_due_date}`}
                    </p>
                  </div>

                  {authService.isAdmin() && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (!confirm('Are you sure you want to delete this patent?')) return;
                        try {
                          await db.patents.delete(patent.id!);
                          loadData();
                        } catch (err) {
                          console.error(err);
                          alert('Failed to delete patent');
                        }
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button className="flex-1" variant="outline" onClick={() => navigate('/patents')}>
                View All Patents
              </Button>

              {authService.isAdmin() && (
                <Button className="flex-1 flex items-center justify-center gap-2" onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4" />
                  Add Patent
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* QUICK ACTIONS */}
        <div className="grid gap-4 md:grid-cols-2 mt-8">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/patents')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Browse All Patents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View, search, and filter the complete patent database
              </p>
            </CardContent>
          </Card>

          {authService.isAdmin() && (
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/import')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Import & Export
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Import new data or export current database
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ADD PATENT DIALOG */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
  <DialogTitle>Add New Patent</DialogTitle>
</DialogHeader>

<div className="grid gap-2 py-2">

  {/* Application Number - mandatory */}
  <Input 
    placeholder="Application Number *"
    value={newPatent.application_number || ''} 
    onChange={e => setNewPatent({ ...newPatent, application_number: e.target.value })} 
  />

  {/* Title - mandatory */}
  <Input 
    placeholder="Title *"
    value={newPatent.title || ''} 
    onChange={e => setNewPatent({ ...newPatent, title: e.target.value })} 
  />

  {/* Inventors - mandatory */}
  <Input 
    placeholder="Inventors *"
    value={newPatent.inventors || ''} 
    onChange={e => setNewPatent({ ...newPatent, inventors: e.target.value })} 
  />

  {/* Applicants - mandatory */}
  <Input 
    placeholder="Applicants *"
    value={newPatent.applicants || ''} 
    onChange={e => setNewPatent({ ...newPatent, applicants: e.target.value })} 
  />

  {/* Filed Date - mandatory */}
  <div>
    <label className="text-xs text-muted-foreground">Filed Date *</label>
    <Input
      type="date"
      value={newPatent.filed_date || ''}
      onChange={e => setNewPatent({ ...newPatent, filed_date: e.target.value })}
    />
  </div>

  {/* Published Date - mandatory */}
  <div>
    <label className="text-xs text-muted-foreground">Published Date *</label>
    <Input
      type="date"
      value={newPatent.published_date || ''}
      onChange={e => setNewPatent({ ...newPatent, published_date: e.target.value })}
    />
  </div>

  {/* Granted Date - OPTIONAL */}
  <div>
    <label className="text-xs text-muted-foreground">Granted Date (optional)</label>
    <Input
      type="date"
      value={newPatent.granted_date || ''}
      onChange={e => setNewPatent({ ...newPatent, granted_date: e.target.value })}
    />
  </div>

  {/* Status - mandatory */}
  <Select 
    value={newPatent.status || ''} 
    onValueChange={value => setNewPatent({ ...newPatent, status: value })}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select Status *" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="Filed">Filed</SelectItem>
      <SelectItem value="AE">AE</SelectItem>
      <SelectItem value="AR">AR</SelectItem>
      <SelectItem value="ACS">ACS</SelectItem>
      <SelectItem value="Granted">Granted</SelectItem>
      <SelectItem value="RF-AAE">RF-AAE</SelectItem>
      <SelectItem value="ARFE">ARFE</SelectItem>
      <SelectItem value="Abandoned">Abandoned</SelectItem>
      <SelectItem value="Hearing">Hearing</SelectItem>
    </SelectContent>
  </Select>

  {/* Patent Number - OPTIONAL */}
  <Input 
    placeholder="Patent Number (optional)"
    value={newPatent.patent_number || ''} 
    onChange={e => setNewPatent({ ...newPatent, patent_number: e.target.value })} 
  />

  {/* Renewal Due Date - mandatory */}
  <div>
    <label className="text-xs text-muted-foreground">Renewal Due Date *</label>
    <Input
      type="date"
      value={newPatent.renewal_due_date || ''}
      onChange={e => setNewPatent({ ...newPatent, renewal_due_date: e.target.value })}
    />
  </div>

  {/* Google Drive Link - OPTIONAL */}
  <Input 
    placeholder="Google Drive Link (optional)"
    value={newPatent.google_drive_link || ''} 
    onChange={e => setNewPatent({ ...newPatent, google_drive_link: e.target.value })} 
  />

  {/* IP India URL - OPTIONAL */}
  <Input 
    placeholder="IP India URL (optional)"
    value={newPatent.ipindia_status_url || ''} 
    onChange={e => setNewPatent({ ...newPatent, ipindia_status_url: e.target.value })} 
  />

</div>

<DialogFooter>
  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>

  <Button
    onClick={async () => {

      // mandatory validation
      if (
        !newPatent.application_number ||
        !newPatent.title || 
        !newPatent.inventors ||
        !newPatent.applicants ||
        !newPatent.status ||
        !newPatent.filed_date ||
        !newPatent.published_date ||
        !newPatent.renewal_due_date
      ) {
        alert('Please fill all required fields marked with *');
        return;
      }

      await handleSavePatent();
    }}
  >
    Save Patent
  </Button>
</DialogFooter>ss
  </DialogContent>
</Dialog>

      </div>
    </div>
  );
}
