// src/components/PatentDetailDialog.tsx
import { useState, useEffect } from 'react';
import { Patent, db, RenewalPayment } from '@/lib/db';
import { authService } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from './StatusBadge';
import { ExternalLink, Plus, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface PatentDetailDialogProps {
  patent: Patent;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  editMode?: boolean;
}

export function PatentDetailDialog({ patent, open, onClose, onUpdate, editMode = false }: PatentDetailDialogProps) {
  const [renewalPayments, setRenewalPayments] = useState<RenewalPayment[]>([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    id: null as number | null,
    payment_date: '',
    amount: '',
    payment_method: '',
    notes: ''
  });

  // edit form state
  const [isEditing, setIsEditing] = useState<boolean>(!!editMode);
  const [form, setForm] = useState<Partial<Patent>>(patent || {});

  useEffect(() => {
    setForm(patent || {});
    if (patent?.id) loadRenewalPayments();
    setIsEditing(!!editMode);
  }, [patent, editMode]);

  const loadRenewalPayments = async () => {
    if (!patent?.id) return;
    const payments = await db.renewal_payments
      .where('patent_id')
      .equals(patent.id)
      .reverse()
      .sortBy('payment_date');
    setRenewalPayments(payments);
  };

  const handleAddOrUpdatePayment = async () => {
    if (!patent?.id) return;
    try {
      if (!paymentForm.payment_date || !paymentForm.amount || !paymentForm.payment_method) {
        toast.error('Payment Date, Amount and Method are required');
        return;
      }

      const data = {
        patent_id: patent.id,
        payment_date: paymentForm.payment_date,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes,
        created_at: new Date().toISOString()
      };

      if (paymentForm.id) {
        // update existing payment
        await db.renewal_payments.update(paymentForm.id, data);
        toast.success('Payment updated');
      } else {
        // add new payment
        await db.renewal_payments.add(data);
        toast.success('Payment added');
      }

      setShowAddPayment(false);
      setPaymentForm({ id: null, payment_date: '', amount: '', payment_method: '', notes: '' });
      loadRenewalPayments();
      onUpdate();
    } catch (error) {
      toast.error('Failed to save payment');
      console.error(error);
    }
  };

  const handleEditPayment = (payment: RenewalPayment) => {
    setPaymentForm({
      id: payment.id!,
      payment_date: payment.payment_date,
      amount: payment.amount.toString(),
      payment_method: payment.payment_method,
      notes: payment.notes || ''
    });
    setShowAddPayment(true);
  };

  const handleDeletePayment = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    try {
      await db.renewal_payments.delete(id);
      toast.success('Payment deleted');
      loadRenewalPayments();
      onUpdate();
    } catch (error) {
      toast.error('Failed to delete payment');
      console.error(error);
    }
  };

  const handleSavePatent = async () => {
    if (!authService.isAdmin()) {
      toast.error('You do not have permission to edit.');
      return;
    }

    if (!form.application_number || !form.title || !form.status || !form.filed_date || !form.renewal_due_date) {
      toast.error('Application number, Title, Status, Filed Date and Renewal Due Date are required.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const updated: Patent = { ...patent, ...form, updated_at: now } as Patent;
      await db.patents.update(patent.id!, updated);
      toast.success('Patent updated');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast.error('Failed to save patent');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <div className="flex-1">
              {isEditing ? (
                <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              ) : (
                <div className="text-lg font-semibold">{patent.title}</div>
              )}
            </div>
            <div>
              <StatusBadge status={patent.status} />
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Application Number', key: 'application_number', type: 'text', required: true },
              { label: 'Patent Number', key: 'patent_number', type: 'text', required: false },
              { label: 'Filed Date', key: 'filed_date', type: 'date', required: true },
              { label: 'Published Date', key: 'published_date', type: 'date', required: false },
              { label: 'Granted Date', key: 'granted_date', type: 'date', required: false },
              { label: 'Renewal Due Date', key: 'renewal_due_date', type: 'date', required: true },
            ].map(({ label, key, type, required }) => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground">{label}{required ? ' *' : ''}</Label>
                {isEditing ? (
                  <Input
                    type={type}
                    value={(form as any)[key] || ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{(form as any)[key] || 'N/A'}</p>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {['Applicants', 'Inventors'].map((field) => (
              <div key={field}>
                <Label className="text-xs text-muted-foreground">{field}</Label>
                {isEditing ? (
                  <Input
                    value={(form as any)[field.toLowerCase()] || ''}
                    onChange={(e) => setForm({ ...form, [field.toLowerCase()]: e.target.value })}
                  />
                ) : (
                  <p>{(form as any)[field.toLowerCase()]}</p>
                )}
              </div>
            ))}
          </div>

          {/* External Links */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Input
                  placeholder="Google Drive Link"
                  value={form.google_drive_link || ''}
                  onChange={(e) => setForm({ ...form, google_drive_link: e.target.value })}
                />
                <Input
                  placeholder="IP India URL"
                  value={form.ipindia_status_url || ''}
                  onChange={(e) => setForm({ ...form, ipindia_status_url: e.target.value })}
                />
              </>
            ) : (
              <>
                {patent.google_drive_link && (
                  <Button variant="outline" size="sm" onClick={() => window.open(patent.google_drive_link!, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Source Document
                  </Button>
                )}
                {patent.ipindia_status_url && (
                  <Button variant="outline" size="sm" onClick={() => window.open(patent.ipindia_status_url!, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    IP India Portal
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Renewal Payments */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-base">₹</span>
                Renewal Payment History
              </h3>
              {authService.isAdmin() && (
                <Button size="sm" onClick={() => { setPaymentForm({ id: null, payment_date: '', amount: '', payment_method: '', notes: '' }); setShowAddPayment(!showAddPayment); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  {showAddPayment ? 'Cancel' : 'Add Payment'}
                </Button>
              )}
            </div>

            {showAddPayment && authService.isAdmin() && (
              <div className="mb-4 p-4 border rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Payment Date *</Label>
                    <Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Amount (INR) *</Label>
                    <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="10000" />
                  </div>
                </div>
                <div>
                  <Label>Payment Method *</Label>
                  <Input value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} placeholder="Bank Transfer, Cheque, Online, etc." />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Any additional details..." rows={2} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddOrUpdatePayment} size="sm">{paymentForm.id ? 'Update Payment' : 'Save Payment'}</Button>
                  <Button variant="outline" onClick={() => setShowAddPayment(false)} size="sm">Cancel</Button>
                </div>
              </div>
            )}

            {renewalPayments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Notes</TableHead>
                    {authService.isAdmin() && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewalPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.payment_date}</TableCell>
                      <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{payment.notes || '-'}</TableCell>
                      {authService.isAdmin() && (
                        <TableCell className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditPayment(payment)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeletePayment(payment.id!)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No renewal payments recorded yet</p>
            )}
          </div>
        </div>

        <DialogFooter>
          {authService.isAdmin() && (
            <>
              {!isEditing && <Button onClick={() => setIsEditing(true)}>Edit Patent</Button>}
              {isEditing && (
                <>
                  <Button onClick={handleSavePatent}>Save Patent</Button>
                  <Button variant="outline" onClick={() => { setIsEditing(false); setForm(patent); }}>Cancel</Button>
                </>
              )}
            </>
          )}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}