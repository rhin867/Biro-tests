import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserKey } from '@/lib/app-settings';
import { formatTime } from '@/lib/exam-utils';

interface Props {
  testId: string;
}

interface Row {
  id: string;
  display_name: string;
  user_key: string;
  score: number;
  max_score: number;
  accuracy: number;
  time_taken: number;
  submitted_at: string;
}

export function Leaderboard({ testId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const myKey = getCurrentUserKey();

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('test_leaderboard')
        .select('*')
        .eq('test_id', testId)
        .order('score', { ascending: false })
        .order('time_taken', { ascending: true })
        .limit(100);
      setRows((data || []) as Row[]);
      setLoading(false);
    })();
  }, [testId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" /> Leaderboard
          <Badge variant="outline" className="ml-2">
            <Users className="h-3 w-3 mr-1" /> {rows.length} attempt{rows.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 text-sm">No attempts yet. Be the first!</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rows.map((r, i) => {
              const isMe = r.user_key === myKey;
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    isMe ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? 'bg-yellow-500 text-black' :
                      i === 1 ? 'bg-gray-300 text-black' :
                      i === 2 ? 'bg-orange-500 text-black' :
                      'bg-muted text-foreground'
                    }`}>{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {r.display_name} {isMe && <Badge variant="outline" className="ml-1 text-xs">You</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(r.submitted_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-correct">{r.score}/{r.max_score}</p>
                    <p className="text-muted-foreground">{r.accuracy.toFixed(1)}% • {formatTime(r.time_taken)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
