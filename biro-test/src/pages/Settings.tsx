import React, { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Key, Eye, EyeOff, CheckCircle, AlertCircle, Download, User } from 'lucide-react';

export function getUserApiKeys(): string[] {
  try {
    const raw = localStorage.getItem('user_gemini_api_keys');
    if (raw) {
      const keys = JSON.parse(raw);
      if (Array.isArray(keys)) return keys.filter(Boolean);
    }
  } catch {}
  const single = localStorage.getItem('user_gemini_api_key');
  return single ? [single] : [];
}

export function setUserApiKeys(keys: string[]): void {
  localStorage.setItem('user_gemini_api_keys', JSON.stringify(keys));
  if (keys.length > 0) {
    localStorage.setItem('user_gemini_api_key', keys[0]);
  } else {
    localStorage.removeItem('user_gemini_api_key');
  }
}

export function getUserApiKey(): string | null {
  const keys = getUserApiKeys();
  if (keys.length === 0) return null;
  const idx = Math.floor(Math.random() * keys.length);
  return keys[idx];
}

const USER_ID_KEY = 'user_profile_id';
const USER_PASS_KEY = 'user_profile_pass';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  // User ID system
  const [userId, setUserId] = useState(localStorage.getItem(USER_ID_KEY) || '');
  const [userPass, setUserPass] = useState('');
  const [hasProfile, setHasProfile] = useState(!!localStorage.getItem(USER_ID_KEY));
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  useEffect(() => {
    const keys = getUserApiKeys();
    setApiKeys(keys);
    setHasKey(keys.length > 0);

    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleAddKey = () => {
    if (!apiKey.trim()) { toast.error('Please enter your Gemini API key'); return; }
    if (apiKeys.includes(apiKey.trim())) { toast.error('Key already added'); return; }
    const updated = [...apiKeys, apiKey.trim()];
    setApiKeys(updated);
    setUserApiKeys(updated);
    setHasKey(true);
    setApiKey('');
    toast.success('API key added! Stored in key rotation pool.');
  };

  const handleRemoveKey = (indexToRemove: number) => {
    const updated = apiKeys.filter((_, idx) => idx !== indexToRemove);
    setApiKeys(updated);
    setUserApiKeys(updated);
    setHasKey(updated.length > 0);
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
    localStorage.setItem(`profile_pass_${userId.trim()}`, userPass.trim());
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
      if (savedPass !== loginPass.trim()) {
        toast.error('Incorrect password');
        return;
      }
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
              Gemini API Keys Rotation Pool
            </CardTitle>
            <CardDescription>
              Add 3-4 keys to rotate automatically and avoid hitting AI limits. Get a key free at{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">
                Google AI Studio
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {apiKeys.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Active Keys ({apiKeys.length})</Label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {apiKeys.map((k, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded bg-background text-xs">
                      <span className="font-mono text-muted-foreground truncate max-w-[200px]">
                        {showKey ? k : `${k.substring(0, 8)}...${k.substring(k.length - 4)}`}
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveKey(index)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Add API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input type={showKey ? 'text' : 'password'} value={apiKey}
                    onChange={e => setApiKey(e.target.value)} placeholder="AIzaSy..." className="pr-10 h-9" />
                  <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button onClick={handleAddKey} size="sm" className="h-9">Add</Button>
              </div>
            </div>
            
            <div className="text-xs font-medium mt-1 flex justify-between">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                <Key className="h-3 w-3" /> Create / Find API Key
              </a>
              {apiKeys.length > 0 && (
                <button className="text-[10px] text-muted-foreground hover:underline" onClick={() => {
                  setUserApiKeys([]);
                  setApiKeys([]);
                  setHasKey(false);
                  toast.success('All API keys cleared');
                }}>Clear All</button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasKey ? (
                <Badge className="bg-correct/20 text-correct border-correct/30"><CheckCircle className="h-3 w-3 mr-1" />{apiKeys.length} Key(s) Active</Badge>
              ) : (
                <Badge variant="outline" className="text-review border-review/30"><AlertCircle className="h-3 w-3 mr-1" />No Keys Active</Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Stored locally in your browser. The app will choose a key at random from your pool for each AI request.</p>
            
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-medium flex items-center gap-2">
                Need Help or Suggestions?
              </p>
              <a href="https://t.me/biro1_a" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                Contact Owner on Telegram: @biro1_a
              </a>
            </div>
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
