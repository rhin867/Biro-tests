import React, { useState, useEffect, useRef } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getResults } from '@/lib/storage';
import {
  Target, Trophy, TrendingUp, Flame, Save, MapPin, Clock, Zap, Star, Upload,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, Cell,
} from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const GOAL_KEY = 'jee_cbt_goal';
const COLLEGE_IMG_KEY = 'goal_college_image';

interface GoalData {
  targetExam: string; targetCollege: string; targetBranch: string;
  targetScore: number; targetPercentile: number; dailyHours: number; monthsRemaining: number;
}

const COLLEGE_DATA: Record<string, { minScore: number; percentile: number; image: string }> = {
  'IIT Bombay - CS': { minScore: 280, percentile: 99.99, image: '🏛️' },
  'IIT Delhi - CS': { minScore: 275, percentile: 99.98, image: '🏛️' },
  'IIT Madras - CS': { minScore: 270, percentile: 99.97, image: '🏛️' },
  'IIT Kanpur - CS': { minScore: 265, percentile: 99.95, image: '🏛️' },
  'IIT Kharagpur - CS': { minScore: 260, percentile: 99.93, image: '🏛️' },
  'IIT Roorkee - CS': { minScore: 250, percentile: 99.90, image: '🏛️' },
  'NIT Trichy - CS': { minScore: 220, percentile: 99.50, image: '🎓' },
  'NIT Warangal - CS': { minScore: 210, percentile: 99.30, image: '🎓' },
  'NIT Surathkal - CS': { minScore: 200, percentile: 99.00, image: '🎓' },
  'BITS Pilani - CS': { minScore: 240, percentile: 99.80, image: '🎓' },
  'IIIT Hyderabad - CS': { minScore: 250, percentile: 99.85, image: '🎓' },
  'DTU Delhi': { minScore: 190, percentile: 98.50, image: '🎓' },
  'NSUT Delhi': { minScore: 185, percentile: 98.00, image: '🎓' },
  'AIIMS Delhi (NEET)': { minScore: 680, percentile: 99.99, image: '🏥' },
  'JIPMER (NEET)': { minScore: 650, percentile: 99.90, image: '🏥' },
  'MAMC Delhi (NEET)': { minScore: 660, percentile: 99.95, image: '🏥' },
  'Custom Target': { minScore: 200, percentile: 99.00, image: '🎯' },
};

function getDefaultGoal(): GoalData {
  try { const s = localStorage.getItem(GOAL_KEY); if (s) return JSON.parse(s); } catch {}
  return { targetExam: 'JEE Mains', targetCollege: 'IIT Bombay - CS', targetBranch: 'Computer Science',
    targetScore: 280, targetPercentile: 99.99, dailyHours: 8, monthsRemaining: 6 };
}

export default function GoalTracker() {
  const [goal, setGoal] = useState<GoalData>(getDefaultGoal());
  const [collegeImage, setCollegeImage] = useState<string | null>(localStorage.getItem(COLLEGE_IMG_KEY));
  const fileRef = useRef<HTMLInputElement>(null);
  const results = getResults();

  const latestScore = results.length > 0
    ? Math.round((results[results.length - 1].score / results[results.length - 1].maxScore) * goal.targetScore) : 0;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.score / r.maxScore), 0) / results.length * goal.targetScore) : 0;

  const collegeInfo = COLLEGE_DATA[goal.targetCollege] || COLLEGE_DATA['Custom Target'];
  const targetScore = goal.targetCollege === 'Custom Target' ? goal.targetScore : collegeInfo.minScore;
  const scoreGap = Math.max(0, targetScore - avgScore);
  const progressPercent = targetScore > 0 ? Math.min(100, Math.round((avgScore / targetScore) * 100)) : 0;
  const totalStudyHours = goal.dailyHours * goal.monthsRemaining * 30;
  const hoursNeededPerMark = scoreGap > 0 ? Math.round(totalStudyHours / scoreGap) : 0;

  const trendData = results.slice(-10).map((r, i) => ({
    name: `Test ${i + 1}`, score: Math.round((r.score / r.maxScore) * targetScore), target: targetScore,
  }));

  const subjectGaps = results.length > 0 ? (() => {
    const latest = results[results.length - 1];
    return (['Physics', 'Chemistry', 'Maths'] as const).map(s => {
      const data = latest.subjectWise[s];
      const subjectMax = Math.round(targetScore / 3);
      const subjectScore = data.total > 0 ? Math.round((data.score / data.maxScore) * subjectMax) : 0;
      return { name: s === 'Maths' ? 'Mathematics' : s, current: subjectScore, target: subjectMax, gap: Math.max(0, subjectMax - subjectScore) };
    });
  })() : [];

  const saveGoal = () => { localStorage.setItem(GOAL_KEY, JSON.stringify(goal)); toast.success('Goal saved!'); };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCollegeImage(dataUrl);
      localStorage.setItem(COLLEGE_IMG_KEY, dataUrl);
      toast.success('College image uploaded!');
    };
    reader.readAsDataURL(file);
  };

  return (
    <MainLayout>
      <PageHeader title="Goal Tracker" description="Set your target college and track progress">
        <Button className="gap-2 glow-primary" onClick={saveGoal}><Save className="h-4 w-4" /> Save Goal</Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Target Exam</label>
          <Select value={goal.targetExam} onValueChange={v => setGoal({ ...goal, targetExam: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['JEE Mains', 'JEE Advanced', 'NEET', 'CUET', 'Other'].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Target College</label>
          <Select value={goal.targetCollege} onValueChange={v => {
            const info = COLLEGE_DATA[v];
            setGoal({ ...goal, targetCollege: v, targetScore: info?.minScore || 200, targetPercentile: info?.percentile || 99 });
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.keys(COLLEGE_DATA).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Daily Study Hours</label>
          <Input type="number" value={goal.dailyHours} min={1} max={16} onChange={e => setGoal({ ...goal, dailyHours: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Months Remaining</label>
          <Input type="number" value={goal.monthsRemaining} min={1} max={24} onChange={e => setGoal({ ...goal, monthsRemaining: Number(e.target.value) })} />
        </div>
      </div>

      {/* Goal Distance Hero */}
      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              {collegeImage ? (
                <img src={collegeImage} alt="Target College" className="h-24 w-24 rounded-xl object-cover border-2 border-primary/30" />
              ) : (
                <div className="text-6xl">{collegeInfo.image}</div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Button variant="outline" size="sm" className="absolute -bottom-2 -right-2 h-7 w-7 p-0 rounded-full"
                onClick={() => fileRef.current?.click()}>
                <Upload className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-bold">{goal.targetCollege}</h2>
              <p className="text-sm text-muted-foreground mt-1">Required: {targetScore} marks • {collegeInfo.percentile}%ile</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Your Avg: <span className="font-bold text-primary">{avgScore}</span></span>
                    <span>Target: <span className="font-bold text-review">{targetScore}</span></span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                </div>
              </div>
            </div>
            <div className="text-center p-4 rounded-xl bg-card border border-border">
              <p className="text-3xl font-bold text-primary">{scoreGap}</p>
              <p className="text-xs text-muted-foreground">Marks Gap</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="pt-6 text-center"><Target className="h-6 w-6 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{progressPercent}%</p><p className="text-xs text-muted-foreground">Progress</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><TrendingUp className="h-6 w-6 mx-auto text-correct mb-2" /><p className="text-2xl font-bold">{latestScore}</p><p className="text-xs text-muted-foreground">Latest Score</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Clock className="h-6 w-6 mx-auto text-review mb-2" /><p className="text-2xl font-bold">{totalStudyHours}h</p><p className="text-xs text-muted-foreground">Hours Left</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Flame className="h-6 w-6 mx-auto text-incorrect mb-2" /><p className="text-2xl font-bold">{hoursNeededPerMark || '∞'}</p><p className="text-xs text-muted-foreground">Hours/Mark</p></CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-lg">Score Trend vs Target</CardTitle></CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} domain={[0, targetScore]} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Your Score" />
                  <Line type="monotone" dataKey="target" stroke="hsl(var(--review))" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Target" />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="flex h-[250px] items-center justify-center text-muted-foreground"><p>Complete tests to see trend</p></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Subject Gap Analysis</CardTitle></CardHeader>
          <CardContent>
            {subjectGaps.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={subjectGaps}>
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="current" fill="hsl(var(--primary))" radius={[4,4,0,0]} name="Current" />
                  <Bar dataKey="gap" fill="hsl(var(--incorrect))" radius={[4,4,0,0]} name="Gap" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex h-[250px] items-center justify-center text-muted-foreground"><p>Complete tests to see gaps</p></div>}
          </CardContent>
        </Card>
      </div>

      {/* Effort */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-review" />Effort Required</CardTitle></CardHeader>
        <CardContent>
          {scoreGap > 0 && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm">
                <Star className="h-4 w-4 inline mr-1 text-review" />
                <strong>Daily Target:</strong> Improve by <span className="font-bold text-primary">{(scoreGap / (goal.monthsRemaining * 30)).toFixed(1)} marks/day</span> with {goal.dailyHours}h daily study over {goal.monthsRemaining} months.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
