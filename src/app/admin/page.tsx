import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { AdminReviewQueue } from '@/components/admin-review-queue';

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');
  return <main className="admin-page"><header><p className="eyebrow">Internal CMS</p><h1>Moderation queue</h1><p className="muted">Approve, reject, or request an edit for community submissions. This route is protected by the temporary environment-password gate.</p></header><AdminReviewQueue /></main>;
}
