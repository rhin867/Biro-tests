import React, { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, Lock, Trash2, Activity, Ban, KeyRound, Loader2 } from 'lucide-react';
import {
  fetchAppSettings,
  updateAppSetting,
  verifyPassword,
  PublicSettings,
} from '@/lib/app-settings';

const VISIT_LOG_KEY = 'admin_visit_log';
const BANNED_KEY = 'admin_banned_users';

function getVisitLog(): any[] {
  try { return JSON.parse(localStorage.getItem(VISIT_LOG_KEY) || '[]'); } catch { return []; }
}

function logVisit() {
  const log = getVisitLog();
  log.push({ timestamp: new Date().toISOString(), page: window.location.pathname });
  localStorage.setItem(VISIT_LOG_KEY, JSON.stringify(log.slice(-500)));
}

if (typeof window !== 'undefined') {
  const existingCount = parseInt(localStorage.getItem('total_visit_count') || '0');
  localStorage.setItem('total_visit_count', String(existingCount + 1));
  localStorage.setItem('last_visit', new Date().toISOString());
  logVisit();
}

export default function AdminPanel() {
  const [step, setStep] = useState<'pass1' | 'pass2' | 'authenticated'>('pass1');
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [verifying, setVerifying] = useState(false);
  // Owner password (admin_password_2) cached IN MEMORY ONLY for the session, used to authorize setting writes.
  const [ownerPassword, setOwnerPassword] = useState<string>('');

  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [bannedUsers, setBannedUsers] = useState<string[]>(
    JSON.parse(localStorage.getItem(BANNED_KEY) || '[]')
  );
  const [banInput, setBanInput] = useState('');

  const [newTestPw, setNewTestPw] = useState('');
  const [expDays, setExpDays] = useState(0);
  const [expHours, setExpHours] = useState(0);
  const [expMinutes, setExpMinutes] = useState(0);
  const [newAdminPw1, setNewAdminPw1] = useState('');
  const [newAdminPw2, setNewAdminPw2] = useState('');
  const [dailyQuota, setDailyQuota] = useState(5);
  const [monthlyQuota, setMonthlyQuota] = useState(50);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    fetchAppSettings().then((s) => {
      setSettings(s);
      setDailyQuota(s.quota_daily_tests);
      setMonthlyQuota(s.quota_monthly_tests);
    });
  }, []);

  const handlePass1 = async () => {
    if (!pass1.trim()) return toast.error('Enter password');
    setVerifying(true);
    const r = await verifyPassword('admin_1', pass1.trim());
    setVerifying(false);
    if (r.ok) { setStep('pass2'); toast.success('Step 1 verified'); }
    else toast.error(r.error || 'Incorrect password');
  };

  const handlePass2 = async () => {
    if (!pass2.trim()) return toast.error('Enter password');
    setVerifying(true);
    const r = await verifyPassword('admin_2', pass2.trim());
    setVerifying(false);
    if (r.ok) {
      setOwnerPassword(pass2.trim()); // keep in memory only for authorized writes
      setStep('authenticated');
      setPass2('');
      toast.success('Welcome, Admin!');
    } else {
      toast.error(r.error || 'Incorrect password');
    }
  };

  const handleSaveTestPassword = async () => {
    if (!ownerPassword) return toast.error('Session expired, re-login');
    if (!newTestPw.trim()) return toast.error('Enter a password');
    setSavingPw(true);
    const totalMs = ((expDays * 24 + expHours) * 60 + expMinutes) * 60 * 1000;
    const expiresAt = totalMs > 0 ? new Date(Date.now() + totalMs).toISOString() : null;
    const r1 = await updateAppSetting('test_creation_password', newTestPw.trim(), ownerPassword);
    const r2 = await updateAppSetting('test_creation_password_expires_at', expiresAt, ownerPassword);
    setSavingPw(false);
    if (r1.ok && r2.ok) {
      toast.success('Test creation password updated');
      setSettings(await fetchAppSettings());
      setNewTestPw('');
    } else {
      toast.error(r1.error || r2.error || 'Failed to update');
    }
  };

  const handleSaveAdminPasswords = async () => {
    if (!ownerPassword) return toast.error('Session expired, re-login');
    if (!newAdminPw1.trim() && !newAdminPw2.trim()) return toast.error('Enter at least one new password');
    setSavingPw(true);
    const tasks: Promise<any>[] = [];
    if (newAdminPw1.trim()) tasks.push(updateAppSetting('admin_password_1', newAdminPw1.trim(), ownerPassword));
    let newOwner = ownerPassword;
    if (newAdminPw2.trim()) {
      tasks.push(updateAppSetting('admin_password_2', newAdminPw2.trim(), ownerPassword));
      newOwner = newAdminPw2.trim();
    }
    const results = await Promise.all(tasks);
    setSavingPw(false);
    if (results.every(r => r.ok)) {
      toast.success('Owner passwords updated');
      setOwnerPassword(newOwner);
      setNewAdminPw1(''); setNewAdminPw2('');
    } else {
      toast.error(results.find(r => !r.ok)?.error || 'Failed to update');
    }
  };

  const handleSaveQuotas = async () => {
    if (!ownerPassword) return toast.error('Session expired, re-login');
    setSavingPw(true);
    const r1 = await updateAppSetting('quota_daily_tests', dailyQuota, ownerPassword);
    const r2 = await updateAppSetting('quota_monthly_tests', monthlyQuota, ownerPassword);
    setSavingPw(false);
    if (r1.ok && r2.ok) {
      toast.success('Quotas updated');
      setSettings(await fetchAppSettings());
    } else {
      toast.error(r1.error || r2.error || 'Failed to update');
    }
  };

  if (step !== 'authenticated') {
    return (
      <MainLayout>
        <PageHeader title="Admin Panel" description="Owner access only — passwords verified server-side" />
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              {step === 'pass1' ? 'Step 1: Enter First Password' : 'Step 2: Enter Second Password'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="password" value={step === 'pass1' ? pass1 : pass2}
              onChange={e => step === 'pass1' ? setPass1(e.target.value) : setPass2(e.target.value)}
              placeholder="Enter password"
              onKeyDown={e => e.key === 'Enter' && (step === 'pass1' ? handlePass1() : handlePass2())} />
            <Button onClick={step === 'pass1' ? handlePass1 : handlePass2} disabled={verifying} className="w-full">
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const communityPosts = JSON.parse(localStorage.getItem('community_posts') || '[]');
  const appRatings = JSON.parse(localStorage.getItem('app_ratings') || '[]');
  const avgRating = appRatings.length > 0
    ? (appRatings.reduce((s: number, r: any) => s + r.rating, 0) / appRatings.length).toFixed(1) : 'N/A';
  const visitLog = getVisitLog();
  const totalVisits = parseInt(localStorage.getItem('total_visit_count') || '0');
  const lastVisit = localStorage.getItem('last_visit') || 'Never';

  const handleDeletePost = (postId: string) => {
    const updated = communityPosts.filter((p: any) => p.id !== postId);
    localStorage.setItem('community_posts', JSON.stringify(updated));
    toast.success('Post deleted');
    window.location.reload();
  };

  const handleBanUser = () => {
    if (!banInput.trim()) return;
    const updated = [...bannedUsers, banInput.trim()];
    setBannedUsers(updated);
    localStorage.setItem(BANNED_KEY, JSON.stringify(updated));
    setBanInput('');
    toast.success(`Banned: ${banInput.trim()}`);
  };

  const handleUnban = (user: string) => {
    const updated = bannedUsers.filter(u => u !== user);
    setBannedUsers(updated);
    localStorage.setItem(BANNED_KEY, JSON.stringify(updated));
    toast.success(`Unbanned: ${user}`);
  };

  const todayVisits = visitLog.filter((v: any) => new Date(v.timestamp).toDateString() === new Date().toDateString()).length;
  const uniquePages = [...new Set(visitLog.map((v: any) => v.page))];

  return (
    <MainLayout>
      <PageHeader title="Admin Panel" description="Manage posts, users, analytics & app data" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-primary">{communityPosts.length}</p>
          <p className="text-xs text-muted-foreground">Posts</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-yellow-400">{avgRating}</p>
          <p className="text-xs text-muted-foreground">Avg Rating</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-correct">{totalVisits}</p>
          <p className="text-xs text-muted-foreground">Total Visits</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-primary">{todayVisits}</p>
          <p className="text-xs text-muted-foreground">Today's Activity</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-incorrect">{bannedUsers.length}</p>
          <p className="text-xs text-muted-foreground">Banned Users</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="passwords">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="passwords">Passwords</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="passwords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" />Test Creation Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Stored securely on the server. Current value is never sent to the browser. Set a new password below.
              </p>
              <p className="text-xs text-muted-foreground">
                Expires: {settings?.test_creation_password_expires_at
                  ? new Date(settings.test_creation_password_expires_at).toLocaleString()
                  : 'Never'}
              </p>
              <div>
                <Label>New password</Label>
                <Input type="password" value={newTestPw} onChange={e => setNewTestPw(e.target.value)} placeholder="New test creation password" />
              </div>
              <div>
                <Label className="text-xs">Valid for (all 0 = never expires)</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div>
                    <Input type="number" min={0} value={expDays} onChange={e => setExpDays(Number(e.target.value) || 0)} />
                    <p className="text-xs text-muted-foreground mt-1">Days</p>
                  </div>
                  <div>
                    <Input type="number" min={0} value={expHours} onChange={e => setExpHours(Number(e.target.value) || 0)} />
                    <p className="text-xs text-muted-foreground mt-1">Hours</p>
                  </div>
                  <div>
                    <Input type="number" min={0} value={expMinutes} onChange={e => setExpMinutes(Number(e.target.value) || 0)} />
                    <p className="text-xs text-muted-foreground mt-1">Minutes</p>
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveTestPassword} disabled={savingPw} className="w-full">
                {savingPw ? 'Saving...' : 'Save Test Password & Expiry'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />Owner Panel Passwords</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Stored on the server. Enter new values below to rotate. Leave blank to keep current.
              </p>
              <div>
                <Label>New 1st password</Label>
                <Input type="password" value={newAdminPw1} onChange={e => setNewAdminPw1(e.target.value)} placeholder="Leave empty to keep current" />
              </div>
              <div>
                <Label>New 2nd password</Label>
                <Input type="password" value={newAdminPw2} onChange={e => setNewAdminPw2(e.target.value)} placeholder="Leave empty to keep current" />
              </div>
              <Button onClick={handleSaveAdminPasswords} disabled={savingPw} className="w-full">
                {savingPw ? 'Saving...' : 'Update Owner Passwords'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Test-Creation Quotas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Controls how many tests each user can create per day / per month. Users see remaining count in the Create Test page.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Daily limit</Label>
                  <Input type="number" min={1} value={dailyQuota} onChange={e => setDailyQuota(Number(e.target.value) || 1)} />
                </div>
                <div>
                  <Label>Monthly limit</Label>
                  <Input type="number" min={1} value={monthlyQuota} onChange={e => setMonthlyQuota(Number(e.target.value) || 1)} />
                </div>
              </div>
              <Button onClick={handleSaveQuotas} disabled={savingPw} className="w-full">
                {savingPw ? 'Saving...' : 'Save Quotas'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Community Posts</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {communityPosts.length === 0 ? <p className="text-center text-muted-foreground py-8">No posts</p> :
                  communityPosts.map((post: any) => (
                    <div key={post.id} className="flex items-start justify-between p-3 rounded-lg border border-border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm">{post.author}</span>
                          <Badge variant="outline" className="text-xs">{post.type}</Badge>
                          <span className="text-xs text-muted-foreground">👍{post.upvotes} 👎{post.downvotes}</span>
                          <span className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm">{post.content}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeletePost(post.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Activity Log</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-sm text-muted-foreground">Last Visit</p>
                  <p className="font-medium text-sm">{new Date(lastVisit).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-sm text-muted-foreground">Pages Visited</p>
                  <p className="font-medium text-sm">{uniquePages.length} unique pages</p>
                </div>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {visitLog.slice(-50).reverse().map((v: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs p-1.5 rounded bg-card border border-border/50">
                    <span className="text-muted-foreground">{new Date(v.timestamp).toLocaleString()}</span>
                    <span>{v.page}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-incorrect" />Ban Management</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Username to ban" value={banInput} onChange={e => setBanInput(e.target.value)} />
                <Button variant="destructive" onClick={handleBanUser}>Ban</Button>
              </div>
              <div className="space-y-2">
                {bannedUsers.length === 0 ? <p className="text-sm text-muted-foreground">No banned users</p> :
                  bannedUsers.map(u => (
                    <div key={u} className="flex justify-between items-center p-2 rounded border border-border">
                      <span className="text-sm">{u}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleUnban(u)}>Unban</Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
