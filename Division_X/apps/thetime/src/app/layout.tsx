import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'TheTime — Premium Time Tracker & Activity Companion',
  description: 'Track your time, master daily focus with Pomodoro cycles, manage tasks in a visual board, and analyze team resource capacities with visual timesheets.',
  icons: {
    icon: '/favicon.ico',
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

