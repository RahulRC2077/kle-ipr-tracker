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
  DollarSign
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

export default function Dashboard() {
  const navigate = useNavigate();
  const [patents, setPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
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
      setPatents(allPatents);
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

  // Calculate statistics
  const totalPatents = patents.length;
  const grantedPatents = patents.filter(p => p.status.toLowerCase().includes('granted')).length;
  const underExamination = patents.filter(p => 
    p.status.toLowerCase().includes('examination') || p.status.toLowerCase().includes('ae')
  ).length;
  const abandonedPatents = patents.filter(p => 
    p.status.toLowerCase().includes('abandoned') || 
    p.status.toLowerCase().includes('ceased') ||
    p.status.toLowerCase().includes('expired')
  ).length;

  // Renewal due calculations
  const today = new Date();
  const renewalsDue30 = patents.filter(p => {
    if (!p.renewal_due_date) return false;
    const dueDate = new Date(p.renewal_due_date);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }).length;

  const renewalsDue60 = patents.filter(p => {
    if (!p.renewal_due_date) return false;
    const dueDate = new Date(p.renewal_due_date);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 30 && diffDays <= 60;
  }).length;

  const renewalsDue90 = patents.filter(p => {
    if (!p.renewal_due_date) return false;
    const dueDate = new Date(p.renewal_due_date);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 60 && diffDays <= 90;
  }).length;

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
      {/* Header */}
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
        {/* Statistics Grid */}
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
                {((grantedPatents / totalPatents) * 100).toFixed(1)}% of total
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

        {/* Renewals Section */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="border-warning/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Due in 30 Days</CardTitle>
              <AlertTriangle className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{renewalsDue30}</div>
              <p className="text-xs text-muted-foreground mt-1">Urgent attention needed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Due in 60 Days</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{renewalsDue60}</div>
              <p className="text-xs text-muted-foreground mt-1">Plan ahead</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Due in 90 Days</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{renewalsDue90}</div>
              <p className="text-xs text-muted-foreground mt-1">Budget planning</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Patents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPatents.map((patent) => (
                <div key={patent.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
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
                </div>
              ))}
            </div>
            
            <Button 
              className="w-full mt-4" 
              variant="outline"
              onClick={() => navigate('/patents')}
            >
              View All Patents
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
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
      </div>
    </div>
  );
}
