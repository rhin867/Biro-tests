import React, { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Key, Eye, EyeOff, CheckCircle, AlertCircle, Download, User, Lock } from 'lucide-react';

export function getUserApiKey(): string | null {
  return localStorage.getItem('user_gemini_api_key');
}

export function setUserApiKey(key: string): void {
  localStorage.setItem('user_gemini_api_key', key);
}

const USER_ID_KEY = 'user_profile_id';
const USER_PASS_KEY = 'user_profile_pass';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  // User ID system
  const [userId, setUserId] = useState(localStorage.getItem(USER_ID_KEY) || '');
  const [userPass, setUserPass] = useState('');
  const [hasProfile, setHasProfile] = useState(!!localStorage.getItem(USER_ID_KEY));
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  useEffect(() => {
    const existing = getUserApiKey();
    if (existing) { setApiKey(existing); setHasKey(true); }

    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleSaveKey = () => {
    if (!apiKey.trim()) { toast.error('Please enter your Gemini API key'); return; }
    setUserApiKey(apiKey.trim());
    setHasKey(true);
    toast.success('API key saved! You can now create unlimited tests.');
  };

  const handleRemoveKey = () => {
    localStorage.removeItem('user_gemini_api_key');
    setApiKey(''); setHasKey(false);
    toast.success('API key removed');
  };

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === 'accepted') toast.success('App installed!');
      setInstallPrompt(null);
    } else {
      toast.info('Tap browser menu (⋮) → "Add to Home Screen" or "Install App"');
    }
  };

  const handleCreateProfile = () => {
    if (!userId.trim() || !userPass.trim()) { toast.error('Enter both ID and password'); return; }
    localStorage.setItem(USER_ID_KEY, userId.trim());
    localStorage.setItem(USER_PASS_KEY, userPass.trim());
    // Save all current data under this user ID
    const allData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allData[key] = localStorage.getItem(key) || '';
    }
    localStorage.setItem(`profile_data_${userId.trim()}`, JSON.stringify(allData));
    setHasProfile(true);
    toast.success(`Profile created! Your ID: ${userId.trim()}`);
  };

  const handleLogin = () => {
    if (!loginId.trim() || !loginPass.trim()) { toast.error('Enter both ID and password'); return; }
    const savedData = localStorage.getItem(`profile_data_${loginId.trim()}`);
    const savedPass = localStorage.getItem(`profile_pass_${loginId.trim()}`);
    
    // Check stored profile
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        // Restore all data
        Object.entries(data).forEach(([key, value]) => {
          if (!key.startsWith('profile_data_') && !key.startsWith('profile_pass_')) {
            localStorage.setItem(key, value as string);
          }
        });
        localStorage.setItem(USER_ID_KEY, loginId.trim());
        setUserId(loginId.trim());
        setHasProfile(true);
        toast.success('Logged in! All your data has been restored.');
        window.location.reload();
      } catch {
        toast.error('Failed to restore data');
      }
    } else {
      toast.error('No profile found with this ID');
    }
  };

  return (
    <MainLayout>
      <PageHeader title="Settings" description="API key, profile & app preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Key - MOST IMPORTANT */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Gemini API Key (Required)
            </CardTitle>
            <CardDescription>
              Required for creating tests and AI features. Get one free at{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Google AI Studio
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input type={showKey ? 'text' : 'password'} value={apiKey}
                onChange={e => setApiKey(e.target.value)} placeholder="AIzaSy..." className="pr-10" />
              <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {hasKey ? (
                <Badge className="bg-correct/20 text-correct border-correct/30"><CheckCircle className="h-3 w-3 mr-1" />Key Active</Badge>
              ) : (
                <Badge variant="outline" className="text-review border-review/30"><AlertCircle className="h-3 w-3 mr-1" />No Key - Set to use app</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveKey} className="flex-1">Save Key</Button>
              {hasKey && <Button variant="destructive" onClick={handleRemoveKey}>Remove</Button>}
            </div>
            <p className="text-xs text-muted-foreground">Stored locally in your browser. Never sent to our servers.</p>
          </CardContent>
        </Card>

        {/* User Profile / ID System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Your Profile ID
            </CardTitle>
            <CardDescription>Create an ID to save and restore your data anytime</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasProfile ? (
              <div className="p-3 rounded-lg bg-correct/10 border border-correct/20">
                <p className="text-sm"><strong>Your ID:</strong> {userId}</p>
                <p className="text-xs text-muted-foreground mt-1">Your data is linked to this ID</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 p-3 rounded-lg border border-border">
                  <p className="text-sm font-medium">Create New Profile</p>
                  <Input placeholder="Choose your ID (e.g., aspirant2024)" value={userId} onChange={e => setUserId(e.target.value)} />
                  <Input type="password" placeholder="Create a password" value={userPass} onChange={e => setUserPass(e.target.value)} />
                  <Button onClick={handleCreateProfile} className="w-full">Create Profile</Button>
                </div>
                <div className="space-y-3 p-3 rounded-lg border border-border">
                  <p className="text-sm font-medium">Login to Existing Profile</p>
                  <Input placeholder="Your ID" value={loginId} onChange={e => setLoginId(e.target.value)} />
                  <Input type="password" placeholder="Your password" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
                  <Button onClick={handleLogin} variant="outline" className="w-full">Login & Restore Data</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Install App */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Install App
            </CardTitle>
            <CardDescription>Install for offline access and native experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleInstall} className="w-full gap-2">
              <Download className="h-4 w-4" /> Install App
            </Button>
            <p className="text-xs text-muted-foreground">
              Mobile: Tap browser menu → "Add to Home Screen". Desktop: Click install icon in address bar.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
