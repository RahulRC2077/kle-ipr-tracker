# KLE-IPR Patent Tracker (Local-Only)

A full-featured, client-side patent application tracking system for KLE Technological University that runs completely in your browser with no backend required.

## Features

- ✅ **Local-First Architecture** - All data stored in browser's IndexedDB
- 📊 **Comprehensive Dashboard** - Statistics, renewals, and analytics
- 🔍 **Advanced Search & Filtering** - Find patents quickly
- 📄 **Excel Import/Export** - Import from KLE-IPR.xlsx, export to CSV/Excel
- 👥 **Role-Based Access** - Admin and Viewer roles
- 💰 **Renewal Management** - Track renewal dates and payment history
- 🔗 **External Links** - Direct links to Google Drive docs and IP India portal
- 📱 **Responsive Design** - Works on desktop and mobile

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:8080`

### Default Login Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

**Viewer Account:**
- Username: `viewer`
- Password: `viewer123`

## First-Time Setup

1. The system automatically initializes on first load
2. Default users are created
3. Patents from `/public/data/KLE-IPR.xlsx` are automatically imported
4. Login with admin credentials to access all features

## User Roles

### Admin
- Full read/write access
- Add/edit patents
- Manage renewal payments
- Import/export data
- View all features

### Viewer
- Read-only access
- Search and filter patents
- View details and renewal information
- Export filtered data

## Data Storage

All data is stored locally in your browser using IndexedDB:
- **Patents** - Complete patent information with metadata
- **Renewal Payments** - Payment history for each patent
- **Users** - Login credentials (passwords hashed with bcrypt)
- **Change Logs** - Audit trail of modifications

### Data Persistence
- Data persists across browser sessions
- No data sent to external servers
- Export database anytime for backup
- Re-import from Excel to restore/update

## Key Features

### Dashboard
- Total patents, granted, under examination statistics
- Renewal alerts (30/60/90 day windows)
- Recent activity feed
- Color-coded status badges

### Patent Management
- Searchable table with filters
- Detailed view with all patent information
- Links to source documents (Google Drive)
- Links to IP India portal
- Renewal payment tracking

### Import & Export
- Import Excel files with patent data
- Re-import default file
- Export filtered results to CSV
- Full database export
- Backup and restore capabilities

### Renewal Tracking
- Visual alerts for upcoming renewals
- Payment history per patent
- Add payment records (admin only)
- Renewal fee tracking

## Excel File Format

The system expects Excel files with the following columns:
- Application Number (with hyperlinks)
- Invention Title
- Status
- Application Date
- Publication Date
- Grant Date
- Renewal Date
- Patent Number
- Applicant
- Main Innovator
- Other Innovators
- Details of IP in Brief

All other columns are preserved in raw_metadata.

## Status Color Coding

- 🟢 **Green** - Granted
- 🔵 **Blue** - Under Examination / AE
- 🟣 **Purple** - Filed / Published
- 🔴 **Red** - Abandoned / Ceased / Expired
- 🟠 **Orange** - Renewal Due
- ⚫ **Gray** - Unknown / Other

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Dexie.js (IndexedDB wrapper)
- **Excel Parsing**: xlsx (SheetJS)
- **Authentication**: bcrypt.js (client-side)
- **Charts**: Recharts
- **State Management**: React hooks

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Security Notes

- Passwords are hashed using bcrypt before storage
- Authentication state stored in localStorage
- All data stays in the browser
- No external API calls (except optional IP India lookups)
- Export functionality for data portability

## Browser Support

Works in all modern browsers that support:
- IndexedDB
- ES6+
- Web Crypto API

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Data Backup

**Important:** Since data is stored in browser storage:

1. **Regular Exports** - Use "Export Full Database" frequently
2. **Browser Data** - Don't clear browser data/cookies
3. **Multiple Browsers** - Data is per-browser, not synced
4. **Backup Files** - Keep exported Excel files safe

## Troubleshooting

### Patents not loading
- Check browser console for errors
- Verify `/public/data/KLE-IPR.xlsx` exists
- Try clearing IndexedDB and refreshing

### Import fails
- Ensure Excel file format matches expected structure
- Check file size (large files may take time)
- Verify column names match

### Lost data
- Check if browser storage was cleared
- Restore from exported backup file
- Re-import from original KLE-IPR.xlsx

## License

Copyright © 2024 KLE Technological University

## Support

For issues or questions:
- Check browser console for errors
- Verify Excel file format
- Ensure browser supports IndexedDB
- Try in incognito mode to rule out extensions

---

**Built with ❤️ for KLE Technological University**
