import Dexie, { Table } from 'dexie';

export interface Patent {
  id?: number;
  application_number: string;
  title: string;
  inventors: string;
  applicants: string;
  filed_date: string | null;
  published_date: string | null;
  granted_date: string | null;
  status: string;
  renewal_due_date: string | null;
  renewal_fee: number | null;
  last_checked: string | null;
  ipindia_status_url: string | null;
  google_drive_link: string | null;
  patent_number: string | null;
  patent_certificate: string | null;
  raw_metadata: any;
  created_at: string;
  updated_at: string;
}

export interface RenewalPayment {
  id?: number;
  patent_id: number;
  payment_date: string;
  amount: number;
  payment_method: string;
  notes: string;
  created_at: string;
}

export interface User {
  id?: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'viewer';
  created_at: string;
  last_login: string | null;
}

export interface ChangeLog {
  id?: number;
  patent_id: number;
  changed_by_user_id: number;
  change_type: string;
  old_value: string;
  new_value: string;
  timestamp: string;
}

export class PatentDatabase extends Dexie {
  patents!: Table<Patent>;
  renewal_payments!: Table<RenewalPayment>;
  users!: Table<User>;
  change_logs!: Table<ChangeLog>;

  constructor() {
    super('KLE_IPR_Database');
    this.version(1).stores({
      patents: '++id, application_number, status, filed_date, renewal_due_date, title',
      renewal_payments: '++id, patent_id, payment_date',
      users: '++id, username, role',
      change_logs: '++id, patent_id, timestamp'
    });
  }
}

export const db = new PatentDatabase();
