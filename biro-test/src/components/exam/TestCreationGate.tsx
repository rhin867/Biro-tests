import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAppSettings,
  isTestCreationUnlocked,
  markTestCreationUnlocked,
  verifyPassword,
  PublicSettings,
} from '@/lib/app-settings';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';

interface Props {
  children: React.ReactNode;
}

export function TestCreationGate({ children }: Props) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchAppSettings().then((s) => {
      setSettings(s);
      setUnlocked(isTestCreationUnlocked(s));
      setLoading(false);
    });
  }, []);

  const handleUnlock = async () => {
    if (!password.trim()) return toast.error('Enter the password');
    setVerifying(true);
    const r = await verifyPassword('test_creation', password.trim());
    setVerifying(false);
    if (r.ok) {
      markTestCreationUnlocked(r.expiresAt ?? null);
      setUnlocked(true);
      toast.success('Unlocked! You can create tests now.');
    } else {
      toast.error(r.error || 'Incorrect password');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (unlocked) return <>{children}</>;

  const exp = settings?.test_creation_password_expires_at;

  return (
    <MainLayout>
      <PageHeader title="Create Test" description="Password required" />
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Enter Test Creation Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Test creation is protected. Password is verified securely on the server — it is never sent to the browser.
          </p>
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          />
          {exp && (
            <p className="text-xs text-muted-foreground">
              Current password expires: {new Date(exp).toLocaleString()}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleUnlock} disabled={verifying} className="flex-1">
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
