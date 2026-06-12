import React, { useState, useEffect, useRef } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { generateId } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import telegramQR from '@/assets/telegram-qr.png';
import {
  MessageSquare, ThumbsUp, ThumbsDown, Lightbulb, AlertTriangle, Send,
  Edit2, X, Check, Star, Share2, MessageCircle, Trophy, ExternalLink,
} from 'lucide-react';

const AUTHOR_KEY = 'community_author';
const AUTHOR_LOCK_KEY = 'community_author_locked_at';
const REWARDS_KEY = 'user_rewards';

interface ChatMessage {
  id: string; author: string; content: string; created_at: string; msg_type: string; post_type: string;
  upvotes: number; downvotes: number;
}

function getLockedAuthor() {
  const name = localStorage.getItem(AUTHOR_KEY) || '';
  const lockedAt = localStorage.getItem(AUTHOR_LOCK_KEY);
  if (!name || !lockedAt) return { name, locked: false };
  return { name, locked: Date.now() - parseInt(lockedAt) < 86400000 };
}

function addReward(points: number, desc: string) {
  try {
    const rewards = JSON.parse(localStorage.getItem(REWARDS_KEY) || '[]');
    rewards.push({ id: generateId(), type: 'action', points, earnedAt: new Date().toISOString(), description: desc });
    localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
  } catch {}
}

export default function Community() {
  const authorInfo = getLockedAuthor();
  const [author, setAuthor] = useState(authorInfo.name);
  const [authorLocked, setAuthorLocked] = useState(authorInfo.locked);
  const [posts, setPosts] = useState<ChatMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<string>('general');
  const [chatMsg, setChatMsg] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load messages from DB
  useEffect(() => {
    const loadMessages = async () => {
      const { data: allMsgs } = await supabase
        .from('community_messages' as any)
        .select('*')
        .order('created_at', { ascending: true })
        .limit(500);
      
      if (allMsgs) {
        const msgs = allMsgs as unknown as ChatMessage[];
        setPosts(msgs.filter(m => m.msg_type === 'post'));
        setChatMessages(msgs.filter(m => m.msg_type === 'chat'));
      }
    };
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel('community-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' },
        (payload: any) => {
          const msg = payload.new as ChatMessage;
          if (msg.msg_type === 'chat') {
            setChatMessages(prev => [...prev, msg]);
          } else {
            setPosts(prev => [msg, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const lockAuthor = () => {
    if (!author.trim()) return;
    localStorage.setItem(AUTHOR_KEY, author.trim());
    localStorage.setItem(AUTHOR_LOCK_KEY, String(Date.now()));
    setAuthorLocked(true);
  };

  const handleSendChat = async () => {
    if (!chatMsg.trim() || !author.trim()) { toast.error('Enter name and message'); return; }
    if (!authorLocked) lockAuthor();
    
    await supabase.from('community_messages' as any).insert({
      author: author.trim(), content: chatMsg.trim(), msg_type: 'chat', post_type: 'general',
    } as any);
    setChatMsg('');
    addReward(2, 'Sent a chat message');
  };

  const handleSubmitPost = async () => {
    if (!newPost.trim() || !author.trim()) { toast.error('Enter name and message'); return; }
    if (!authorLocked) lockAuthor();
    
    await supabase.from('community_messages' as any).insert({
      author: author.trim(), content: newPost.trim(), msg_type: 'post', post_type: postType,
    } as any);
    setNewPost('');
    addReward(10, 'Posted in community');
    toast.success('Posted! +10 XP');
  };

  const handleSubmitRating = async () => {
    if (rating === 0) { toast.error('Select a rating'); return; }
    await supabase.from('community_messages' as any).insert({
      author: author.trim() || 'Anonymous',
      content: `⭐ ${rating}/5 - ${feedback || 'No comment'}`,
      msg_type: 'post', post_type: 'rating',
    } as any);
    addReward(15, 'Rated the app');
    toast.success('Thanks for feedback! +15 XP');
    setRating(0); setFeedback('');
  };

  const getTypeIcon = (type: string) => {
    if (type === 'suggestion') return <Lightbulb className="h-4 w-4 text-yellow-400" />;
    if (type === 'obstacle') return <AlertTriangle className="h-4 w-4 text-red-400" />;
    return <MessageSquare className="h-4 w-4 text-primary" />;
  };

  const totalPoints = (() => {
    try { return JSON.parse(localStorage.getItem(REWARDS_KEY) || '[]').reduce((s: number, r: any) => s + r.points, 0); }
    catch { return 0; }
  })();

  return (
    <MainLayout>
      <PageHeader title="Community" description="Live chat, suggestions & connect with other aspirants">
        <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 gap-1">
          <Trophy className="h-3 w-3" /> {totalPoints} XP
        </Badge>
      </PageHeader>

      {/* Author + Links */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input placeholder="Your display name" value={author} onChange={e => !authorLocked && setAuthor(e.target.value)}
          className="max-w-xs" disabled={authorLocked} />
        {authorLocked && <span className="text-xs text-muted-foreground">🔒 Locked 24h</span>}
        <a href="https://t.me/biroskills" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1">
            <ExternalLink className="h-3 w-3" /> Telegram
          </Button>
        </a>
        <a href="https://biro-log.netlify.app" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1">
            <ExternalLink className="h-3 w-3" /> Biro-Log
          </Button>
        </a>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="chat">Live Chat</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="rate">Rate</TabsTrigger>
          <TabsTrigger value="connect">Connect</TabsTrigger>
        </TabsList>

        {/* Live Chat */}
        <TabsContent value="chat">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" />Live Chat</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[400px] overflow-y-auto border border-border rounded-lg p-3 mb-3 space-y-2 bg-secondary/20">
                {chatMessages.length === 0 && <p className="text-center text-muted-foreground py-8">No messages yet. Start chatting!</p>}
                {chatMessages.map(msg => (
                  <div key={msg.id} className="p-2 rounded-lg bg-card border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-xs text-primary">{msg.author}</span>
                      <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2">
                <Input placeholder="Type a message..." value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()} className="flex-1" />
                <Button onClick={handleSendChat} size="icon"><Send className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Posts */}
        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <select value={postType} onChange={e => setPostType(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-background text-sm">
                <option value="general">General</option>
                <option value="suggestion">Feature Suggestion</option>
                <option value="obstacle">Bug/Obstacle</option>
              </select>
              <div className="flex gap-2">
                <Textarea placeholder="Share your thoughts..." value={newPost} onChange={e => setNewPost(e.target.value)} rows={2} className="flex-1" />
                <Button onClick={handleSubmitPost} size="icon" className="self-end"><Send className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
          {posts.length === 0 ? <p className="text-center text-muted-foreground py-8">No posts yet</p> :
            posts.map(post => (
              <Card key={post.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {getTypeIcon(post.post_type)}
                    <span className="font-medium text-sm">{post.author}</span>
                    <Badge variant="outline" className="text-xs">{post.post_type}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm">{post.content}</p>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* Rate */}
        <TabsContent value="rate">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-400" />Rate This App</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setRating(s)} className="p-1 hover:scale-110 transition-transform">
                    <Star className={`h-7 w-7 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                  </button>
                ))}
                <span className="text-sm text-muted-foreground">{rating}/5</span>
              </div>
              <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What can be improved?" rows={3} />
              <Button onClick={handleSubmitRating}>Submit Rating</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connect */}
        <TabsContent value="connect">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">📱 Telegram Community</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <img src={telegramQR} alt="Telegram QR" className="w-40 h-40 mx-auto rounded-lg border border-border" />
                <a href="https://t.me/biroskills" target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2"><ExternalLink className="h-4 w-4" /> Join t.me/biroskills</Button>
                </a>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">📊 Biro-Log Study Tracker</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Track your daily study hours, get mentorship tips, and stay accountable with our companion app.</p>
                <a href="https://biro-log.netlify.app" target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2"><ExternalLink className="h-4 w-4" /> Open Biro-Log</Button>
                </a>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">🤖 Biro-Brain AI</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Ask doubts, get explanations, create study plans with our AI assistant.</p>
                <a href="/biro-brain">
                  <Button variant="outline" className="w-full gap-2"><ExternalLink className="h-4 w-4" /> Open Biro-Brain</Button>
                </a>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">🏆 Share & Earn XP</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full gap-2 justify-start"
                  onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(`Join JEE CBT Analyzer: ${window.location.origin}`)}`); addReward(5, 'Shared on WhatsApp'); }}>
                  Share on WhatsApp
                </Button>
                <Button variant="outline" className="w-full gap-2 justify-start"
                  onClick={() => { window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}`); addReward(5, 'Shared on Telegram'); }}>
                  Share on Telegram
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
