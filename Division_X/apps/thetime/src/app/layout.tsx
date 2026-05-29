import type { Metadata, Viewport } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'TheTime — Premium Time Tracker & Activity Companion',
  description: 'Track your time, master daily focus with Pomodoro cycles, manage tasks in a visual board, and analyze team resource capacities with visual timesheets.',
  icons: {
    icon: '/favicon.ico',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TheTime',
  },
  applicationName: 'TheTime',
};

export const viewport: Viewport = {
  themeColor: '#0a3d2e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

