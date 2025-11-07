import bcrypt from 'bcryptjs';
import { db } from './db';
import { importFromPublicFile } from './excel-import';

export async function initializeDatabase(): Promise<boolean> {
  try {
    // Check if already initialized
    const userCount = await db.users.count();
    
    if (userCount === 0) {
      console.log('Initializing database with default users...');
      
      // Create default users
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      const viewerPasswordHash = await bcrypt.hash('viewer123', 10);
      
      await db.users.bulkAdd([
        {
          username: 'admin',
          password_hash: adminPasswordHash,
          role: 'admin',
          created_at: new Date().toISOString(),
          last_login: null
        },
        {
          username: 'viewer',
          password_hash: viewerPasswordHash,
          role: 'viewer',
          created_at: new Date().toISOString(),
          last_login: null
        }
      ]);
      
      console.log('Default users created');
    }
    
    // Check if patents imported
    const patentCount = await db.patents.count();
    
    if (patentCount === 0) {
      console.log('Importing patents from Excel file...');
      const result = await importFromPublicFile();
      
      if (result.success) {
        console.log(`Successfully imported ${result.imported} patents`);
      } else {
        console.error('Failed to import patents:', result.errors);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}
