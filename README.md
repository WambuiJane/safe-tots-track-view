
# Linda Mtoto App

A real-time child safety and location tracking application that enables parents to monitor their children's whereabouts and receive emergency alerts. Built with modern web technologies and Supabase for backend services.

## 🚀 Features

### For Parents
- **Real-time Location Tracking**: Monitor children's locations on an interactive map
- **Geofencing**: Create safe zones and receive alerts when children enter/exit areas
- **Child Management**: Invite and manage multiple children
- **Emergency Alerts**: Receive SOS notifications and quick status updates
- **Alert Dashboard**: View and manage all alerts in one place

### For Children
- **SOS Emergency Button**: Send immediate alerts to parents
- **Shake-to-Alert**: Emergency alerts triggered by device motion
- **Fake Call Feature**: Discreet emergency call simulation
- **Quick Status Messages**: Send pre-defined status updates to parents
- **Location Sharing**: Automatic location sharing with parents

## 🏗️ Architecture

### Frontend Architecture
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn/UI components
│   ├── Map.tsx         # Interactive map component
│   ├── ChildrenManager.tsx
│   ├── AlertsPanel.tsx
│   └── ...
├── pages/              # Main application pages
│   ├── Auth.tsx        # Authentication page
│   ├── Dashboard.tsx   # Parent dashboard
│   ├── ChildDashboard.tsx
│   └── Index.tsx       # Landing page
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication state management
├── integrations/       # External service integrations
│   └── supabase/       # Supabase client and types
└── hooks/              # Custom React hooks
```

### Backend Architecture (Supabase)
- **Authentication**: Email/password with role-based access (parent/child)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: WebSocket connections for live updates
- **Edge Functions**: Server-side logic for child invitations

### Database Schema
```sql
profiles              # User profiles with roles
├── id (uuid)         # References auth.users
├── user_role         # 'parent' | 'child'
├── full_name
└── avatar_url

parent_child_relations # Parent-child relationships
├── parent_id (uuid)
├── child_id (uuid)
└── created_at

location_history      # Child location tracking
├── child_id (uuid)
├── latitude
├── longitude
├── recorded_at
├── speed
└── battery_level

geofences            # Parent-defined safe zones
├── parent_id (uuid)
├── name
├── latitude
├── longitude
├── radius
└── created_at

alerts               # Emergency and status alerts
├── child_id (uuid)
├── alert_type       # 'SOS' | 'status' | 'geofence'
├── message
├── geofence_id (uuid, optional)
├── is_read
└── created_at

quick_messages       # Child status updates
├── child_id (uuid)
├── message
├── sent_at
└── is_read
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/UI** - Pre-built component library
- **Lucide React** - Icon library
- **Leaflet/React-Leaflet** - Interactive maps

### Backend & Services
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
  - Edge Functions
  - Row Level Security
- **Geolocation API** - Browser location services
- **Device Motion API** - Shake detection

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **TypeScript** - Static type checking

## 📦 Dependencies

### Core Dependencies
```json
{
  "@supabase/supabase-js": "^2.50.0",
  "@tanstack/react-query": "^5.56.2",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.26.2",
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1"
}
```

### UI & Styling
```json
{
  "tailwindcss": "latest",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.2",
  "tailwindcss-animate": "^1.0.7",
  "lucide-react": "^0.462.0"
}
```

### Form & Validation
```json
{
  "react-hook-form": "^7.53.0",
  "@hookform/resolvers": "^3.9.0",
  "zod": "^3.23.8"
}
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd linda-mtoto-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
The project uses Supabase with the following configuration:
- Supabase URL: `https://smvspuwtsmlbnmjguawy.supabase.co`
- Anon Key: Pre-configured in the client

4. **Database Setup**
The project includes SQL migrations in `supabase/migrations/` that set up:
- User profiles with role-based access
- Parent-child relationships
- Location tracking
- Geofencing
- Alert system

5. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## 🔒 Security Features

### Authentication & Authorization
- **Role-based Access Control**: Separate dashboards for parents and children
- **Row Level Security**: Database-level access control
- **Secure Invitations**: Children invited via secure email links
- **Session Management**: Automatic token refresh and persistence

### Data Privacy
- **Location Encryption**: Sensitive location data protected
- **Parent-Child Isolation**: Children can only be accessed by their assigned parents
- **Audit Trail**: All alerts and location updates timestamped

## 🌐 Deployment

### Lovable Platform (Recommended)
The project is configured for deployment on Lovable:
```bash
# Deploy via Lovable interface
# Click "Publish" in the Lovable editor
```

### Manual Deployment
For other platforms:
```bash
npm run build
# Deploy the dist/ folder to your hosting provider
```

### Environment Variables
No additional environment variables required - Supabase configuration is embedded.

## 📱 User Flows

### Parent Registration & Setup
1. Sign up with email/password
2. Access parent dashboard
3. Invite children via email
4. Set up geofences
5. Monitor children's locations

### Child Onboarding
1. Receive invitation email
2. Click invitation link
3. Set up profile name
4. Access child dashboard
5. Enable location sharing

### Emergency Scenarios
1. **SOS Alert**: Child presses emergency button
2. **Shake Alert**: Child shakes device vigorously
3. **Fake Call**: Child activates discreet help feature
4. **Geofence Alert**: Child enters/exits defined areas

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Code Organization
- **Components**: Modular, reusable UI components
- **Pages**: Top-level route components
- **Hooks**: Custom React hooks for data fetching
- **Contexts**: Application-wide state management
- **Types**: TypeScript definitions (auto-generated from Supabase)

### Real-time Features
The application uses Supabase real-time subscriptions for:
- Live location updates
- Instant alert notifications
- Real-time geofence monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is built with Lovable and deployed on the Lovable platform.

## 🆘 Support

For technical support or questions:
- Check the [Lovable Documentation](https://docs.lovable.dev/)
- Join the [Lovable Discord Community](https://discord.com/channels/1119885301872070706/1280461670979993613)

---

Built with ❤️ using [Lovable](https://lovable.dev)
