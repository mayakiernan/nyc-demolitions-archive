import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'NYC Building Demolitions Archive', description: 'NYC demolition permits with community history and preservation context.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
