import React from 'react';
import { QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubjectMovementProps {
  questionResults: QuestionResult[];
}

const subjectColors: Record<Subject, string> = {
  Physics: 'bg-[hsl(199,89%,48%)]/20 text-[hsl(199,89%,48%)] border-[hsl(199,89%,48%)]/30',
  Chemistry: 'bg-[hsl(142,76%,36%)]/20 text-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)]/30',
  Maths: 'bg-[hsl(280,65%,60%)]/20 text-[hsl(280,65%,60%)] border-[hsl(280,65%,60%)]/30',
};

const subjectIconBg: Record<Subject, string> = {
  Physics: 'bg-[hsl(199,89%,48%)]/20 border-[hsl(199,89%,48%)]/40',
  Chemistry: 'bg-[hsl(142,76%,36%)]/20 border-[hsl(142,76%,36%)]/40',
  Maths: 'bg-[hsl(280,65%,60%)]/20 border-[hsl(280,65%,60%)]/40',
};

const subjectIcons: Record<Subject, string> = {
  Physics: '⚛️',
  Chemistry: '🧪',
  Maths: '📐',
};

function formatTimeHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h} hr ${m} min ${s} sec`;
  if (m > 0) return `${m} min ${s} sec`;
  return `${s} sec`;
}

export function SubjectMovement({ questionResults }: SubjectMovementProps) {
  // Build sessions with exact time tracking
  const sessions: {
    subject: Subject;
    action: string;
    questions: number;
    timeSpent: number;
    correct: number;
    attempted: number;
  }[] = [];

  let sessionSubject = questionResults[0]?.subject;
  let sessionStart = 0;

  questionResults.forEach((q, i) => {
    if (q.subject !== sessionSubject || i === questionResults.length - 1) {
      const endIdx = q.subject !== sessionSubject ? i : i + 1;
      const sessionQs = questionResults.slice(sessionStart, endIdx);
      
      sessions.push({
        subject: sessionSubject,
        action: sessions.length === 0 ? 'Started with' : 'Switched to',
        questions: sessionQs.length,
        timeSpent: sessionQs.reduce((s, sq) => s + sq.timeSpent, 0),
        correct: sessionQs.filter(sq => sq.isCorrect).length,
        attempted: sessionQs.filter(sq => sq.isAttempted).length,
      });
      
      if (q.subject !== sessionSubject) {
        sessionSubject = q.subject;
        sessionStart = i;
      }
    }
  });

  // Mark last session
  if (sessions.length > 0) {
    sessions[sessions.length - 1].action = 'Ended with';
  }

  // Per-subject total time
  const subjectStats = (['Physics', 'Chemistry', 'Maths'] as Subject[]).map(subject => {
    const qs = questionResults.filter(q => q.subject === subject);
    const correct = qs.filter(q => q.isCorrect).length;
    const attempted = qs.filter(q => q.isAttempted).length;
    const time = qs.reduce((s, q) => s + q.timeSpent, 0);
    return {
      subject,
      total: qs.length,
      correct,
      attempted,
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
      time,
      attemptPercent: qs.length > 0 ? Math.round((attempted / qs.length) * 100) : 0,
    };
  }).filter(s => s.total > 0);

  const switches = sessions.length - 1;

  const bestSubject = subjectStats.reduce((best, s) =>
    s.accuracy > best.accuracy ? s : best, subjectStats[0]);
  const firstSubject = questionResults[0]?.subject;

  return (
    <div className="space-y-6">
      {/* Visual Flow Path - like Quizrr/Mathongo */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Movement</CardTitle>
          <CardDescription>
            How you traversed each subject and time spent between switches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Horizontal scroll flow */}
          <div className="overflow-x-auto pb-4">
            <div className="flex items-center gap-2 min-w-max">
              {sessions.map((session, i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center gap-2 min-w-[140px]">
                    <div className={cn(
                      'h-14 w-14 rounded-full border-2 flex items-center justify-center text-xl',
                      subjectIconBg[session.subject]
                    )}>
                      {subjectIcons[session.subject]}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium">
                        {session.action} {session.subject === 'Maths' ? 'Mathematics' : session.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.attempted} Qs attempted
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Spent {formatTimeHMS(session.timeSpent)}
                      </p>
                    </div>
                  </div>
                  {i < sessions.length - 1 && (
                    <div className="flex items-center gap-0.5 text-muted-foreground/50 flex-shrink-0 -mt-8">
                      <div className="w-6 h-px bg-muted-foreground/30" />
                      <ArrowRight className="h-3 w-3" />
                      <div className="w-6 h-px bg-muted-foreground/30" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center mt-4">
            Total subject switches: <span className="font-medium text-foreground">{switches}</span>
          </p>
        </CardContent>
      </Card>

      {/* Table: Subject Movement Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movement Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Action</th>
                  <th className="text-left py-3 px-4 font-medium">Subject</th>
                  <th className="text-right py-3 px-4 font-medium">Time Spent</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-3 px-4 text-muted-foreground">{session.action}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={cn('border', subjectColors[session.subject])}>
                        {session.subject === 'Maths' ? 'Mathematics' : session.subject}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatTimeHMS(session.timeSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Time & Accuracy Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Time and Accuracy</CardTitle>
          <CardDescription>
            Time is the most important resource. Check your balance between accuracy and time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Subject</th>
                  <th className="text-center py-3 px-4 font-medium">Time Spent</th>
                  <th className="text-center py-3 px-4 font-medium">Attempt (%)</th>
                  <th className="text-center py-3 px-4 font-medium">Accuracy (%)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50 font-semibold">
                  <td className="py-3 px-4">Overall</td>
                  <td className="py-3 px-4 text-center">
                    {formatTimeHMS(questionResults.reduce((s, q) => s + q.timeSpent, 0))}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {questionResults.length > 0 
                      ? Math.round((questionResults.filter(q => q.isAttempted).length / questionResults.length) * 100)
                      : 0}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {(() => {
                      const a = questionResults.filter(q => q.isAttempted);
                      return a.length > 0 ? Math.round((a.filter(q => q.isCorrect).length / a.length) * 100) : 0;
                    })()}
                  </td>
                </tr>
                {subjectStats.map(s => (
                  <tr key={s.subject} className="border-b border-border/30">
                    <td className="py-3 px-4">{s.subject === 'Maths' ? 'Mathematics' : s.subject}</td>
                    <td className="py-3 px-4 text-center">{formatTimeHMS(s.time)}</td>
                    <td className="py-3 px-4 text-center">{s.attemptPercent}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn(
                        'font-medium',
                        s.accuracy >= 70 ? 'text-correct' : s.accuracy >= 40 ? 'text-review' : 'text-incorrect'
                      )}>
                        {s.accuracy}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {bestSubject && firstSubject !== bestSubject.subject && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm mb-1">Strategy Recommendation</p>
                <p className="text-sm text-muted-foreground">
                  You started with {firstSubject}, but your highest accuracy is in {bestSubject.subject} ({bestSubject.accuracy}%).
                  Consider starting with {bestSubject.subject} next time to secure easier marks early.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {switches > 6 && (
        <Card className="border-review/20 bg-review/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-review mt-0.5" />
              <div>
                <p className="font-medium text-sm mb-1">⚠️ Too Many Switches ({switches})</p>
                <p className="text-sm text-muted-foreground">
                  Frequent switching can indicate panic. Try to complete one subject section before moving to the next.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
