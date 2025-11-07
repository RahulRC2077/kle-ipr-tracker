import bcrypt from 'bcryptjs';
import { db, User } from './db';

export interface AuthUser {
  id: number;
  username: string;
  role: 'admin' | 'viewer';
}

class AuthService {
  private currentUser: AuthUser | null = null;
  private listeners: ((user: AuthUser | null) => void)[] = [];

  constructor() {
    // Load user from localStorage on init
    const stored = localStorage.getItem('kle_ipr_user');
    if (stored) {
      this.currentUser = JSON.parse(stored);
    }
  }

  subscribe(callback: (user: AuthUser | null) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentUser));
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await db.users.where('username').equals(username).first();
      
      if (!user) {
        return { success: false, error: 'Invalid username or password' };
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isValid) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Update last login
      await db.users.update(user.id!, { last_login: new Date().toISOString() });

      this.currentUser = {
        id: user.id!,
        username: user.username,
        role: user.role
      };

      localStorage.setItem('kle_ipr_user', JSON.stringify(this.currentUser));
      this.notifyListeners();

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('kle_ipr_user');
    this.notifyListeners();
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}

export const authService = new AuthService();
