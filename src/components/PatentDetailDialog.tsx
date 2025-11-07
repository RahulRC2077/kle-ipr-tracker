import { useState, useEffect } from 'react';
import { Patent, db, RenewalPayment } from '@/lib/db';
import { authService } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { ExternalLink, Plus, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface PatentDetailDialogProps {
  patent: Patent;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function PatentDetailDialog({ patent, open, onClose, onUpdate }: PatentDetailDialogProps) {
  const [renewalPayments, setRenewalPayments] = useState<RenewalPayment[]>([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_date: '',
    amount: '',
    payment_method: '',
    notes: ''
  });
  const isAdmin = authService.isAdmin();

  useEffect(() => {
    if (patent.id) {
      loadRenewalPayments();
    }
  }, [patent.id]);

  const loadRenewalPayments = async () => {
    if (!patent.id) return;
    
    const payments = await db.renewal_payments
      .where('patent_id')
      .equals(patent.id)
      .reverse()
      .sortBy('payment_date');
    
    setRenewalPayments(payments);
  };

  const handleAddPayment = async () => {
    if (!patent.id) return;
    
    try {
      await db.renewal_payments.add({
        patent_id: patent.id,
        payment_date: paymentForm.payment_date,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes,
        created_at: new Date().toISOString()
      });

      toast.success('Payment record added');
      setShowAddPayment(false);
      setPaymentForm({
        payment_date: '',
        amount: '',
        payment_method: '',
        notes: ''
      });
      loadRenewalPayments();
      onUpdate();
    } catch (error) {
      toast.error('Failed to add payment');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{patent.title}</span>
            <StatusBadge status={patent.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Application Number</Label>
              <p className="font-mono font-medium">{patent.application_number}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Patent Number</Label>
              <p className="font-medium">{patent.patent_number || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Filed Date</Label>
              <p>{patent.filed_date || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Published Date</Label>
              <p>{patent.published_date || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Granted Date</Label>
              <p>{patent.granted_date || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Renewal Due Date</Label>
              <p className="font-medium text-warning">{patent.renewal_due_date || 'N/A'}</p>
            </div>
          </div>

          {/* Applicants & Inventors */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Applicants</Label>
              <p>{patent.applicants}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Inventors</Label>
              <p>{patent.inventors}</p>
            </div>
          </div>

          {/* Description */}
          {patent.raw_metadata?.details && (
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-sm">{patent.raw_metadata.details}</p>
            </div>
          )}

          {/* External Links */}
          <div className="flex gap-2">
            {patent.google_drive_link && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(patent.google_drive_link!, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Source Document
              </Button>
            )}
            {patent.ipindia_status_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(patent.ipindia_status_url!, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                IP India Portal
              </Button>
            )}
          </div>

          {/* Renewal Payments */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Renewal Payment History
              </h3>
              {isAdmin && (
                <Button size="sm" onClick={() => setShowAddPayment(!showAddPayment)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Payment
                </Button>
              )}
            </div>

            {showAddPayment && (
              <div className="mb-4 p-4 border rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Amount (INR)</Label>
                    <Input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      placeholder="10000"
                    />
                  </div>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Input
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    placeholder="Bank Transfer, Cheque, Online, etc."
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Any additional details..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddPayment} size="sm">Save Payment</Button>
                  <Button onClick={() => setShowAddPayment(false)} size="sm" variant="outline">Cancel</Button>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewalPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.payment_date}</TableCell>
                      <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No renewal payments recorded yet
              </p>
            )}
          </div>

          {/* Raw Metadata */}
          <details className="border rounded-lg p-4">
            <summary className="cursor-pointer font-medium">View Raw Metadata</summary>
            <pre className="mt-3 p-3 bg-muted rounded text-xs overflow-auto">
              {JSON.stringify(patent.raw_metadata, null, 2)}
            </pre>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}
