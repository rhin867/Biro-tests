import React from 'react';
import { QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AttemptAnalysisProps {
  questionResults: QuestionResult[];
}

type AttemptQuality = 'Perfect' | 'Overtime' | 'Wasted' | 'Confused' | 'Normal';

function classifyAttempt(q: QuestionResult, idealTime: number = 180): AttemptQuality {
  if (q.isCorrect) {
    return q.timeSpent <= idealTime ? 'Perfect' : 'Overtime';
  }
  if (q.isAttempted && !q.isCorrect) {
    return q.timeSpent < idealTime * 0.25 ? 'Wasted' : 'Overtime';
  }
  if (!q.isAttempted && q.timeSpent > idealTime * 0.5) {
    return 'Confused';
  }
  return 'Normal';
}

const qualityColors: Record<AttemptQuality, string> = {
  Perfect: 'hsl(142, 76%, 36%)',
  Overtime: 'hsl(30, 95%, 55%)',
  Wasted: 'hsl(0, 84%, 60%)',
  Confused: 'hsl(48, 96%, 53%)',
  Normal: 'hsl(var(--muted-foreground))',
};

const qualityDescriptions: Record<AttemptQuality, string> = {
  Perfect: 'Correct answer within ideal time',
  Overtime: 'Took longer than allotted time',
  Wasted: 'Wrong answer with very little time spent (guessing)',
  Confused: 'Spent time but didn\'t answer',
  Normal: 'Skipped quickly',
};

export function AttemptAnalysis({ questionResults }: AttemptAnalysisProps) {
  const getSubjectData = (subject: Subject | 'All') => {
    const qs = subject === 'All' ? questionResults : questionResults.filter(q => q.subject === subject);
    
    const counts: Record<AttemptQuality, number> = {
      Perfect: 0, Overtime: 0, Wasted: 0, Confused: 0, Normal: 0,
    };

    qs.forEach(q => {
      const quality = classifyAttempt(q);
      counts[quality]++;
    });

    return {
      counts,
      chartData: Object.entries(counts)
        .filter(([_, count]) => count > 0)
        .map(([quality, count]) => ({
          name: quality,
          value: count,
          color: qualityColors[quality as AttemptQuality],
          description: qualityDescriptions[quality as AttemptQuality],
          percentage: qs.length > 0 ? ((count / qs.length) * 100).toFixed(1) : '0',
        })),
    };
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">{data.description}</p>
          <p className="text-sm font-medium mt-1">{data.value} questions ({data.percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  const renderSection = (subject: Subject | 'All') => {
    const { counts, chartData } = getSubjectData(subject);
    if (chartData.length === 0) {
      return <p className="text-center text-muted-foreground py-8">No data</p>;
    }

    const subjects: (Subject | 'All')[] = subject === 'All'
      ? ['All', 'Maths', 'Physics', 'Chemistry']
      : [subject];

    return (
      <div className="space-y-6">
        {/* Table View - like PDF page 8 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium"></th>
                <th className="text-center py-3 px-4 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: qualityColors.Perfect }} />
                    Perfect
                  </span>
                </th>
                <th className="text-center py-3 px-4 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: qualityColors.Wasted }} />
                    Wasted
                  </span>
                </th>
                <th className="text-center py-3 px-4 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: qualityColors.Overtime }} />
                    Overtime
                  </span>
                </th>
                <th className="text-center py-3 px-4 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: qualityColors.Confused }} />
                    Confused
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {subject === 'All' && (
                <>
                  <tr className="border-b border-border/50 font-semibold">
                    <td className="py-3 px-4">Overall</td>
                    <td className="py-3 px-4 text-center">{counts.Perfect}</td>
                    <td className="py-3 px-4 text-center">{counts.Wasted}</td>
                    <td className="py-3 px-4 text-center">{counts.Overtime}</td>
                    <td className="py-3 px-4 text-center">{counts.Confused}</td>
                  </tr>
                  {(['Maths', 'Physics', 'Chemistry'] as Subject[]).map(s => {
                    const sd = getSubjectData(s);
                    return (
                      <tr key={s} className="border-b border-border/30">
                        <td className="py-3 px-4">{s === 'Maths' ? 'Mathematics' : s}</td>
                        <td className="py-3 px-4 text-center">{sd.counts.Perfect}</td>
                        <td className="py-3 px-4 text-center">{sd.counts.Wasted}</td>
                        <td className="py-3 px-4 text-center">{sd.counts.Overtime}</td>
                        <td className="py-3 px-4 text-center">{sd.counts.Confused}</td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Donut Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-3 text-center">
              {subject === 'All' ? 'All Attempts' : subject}
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {subject === 'All' && (
            <div className="grid grid-cols-1 gap-4">
              {(['Maths', 'Physics', 'Chemistry'] as Subject[]).map(s => {
                const sd = getSubjectData(s);
                if (sd.chartData.length === 0) return null;
                return (
                  <div key={s} className="flex items-center gap-4">
                    <span className="text-sm font-medium w-24">{s === 'Maths' ? 'Mathematics' : s}</span>
                    <div className="flex-1 h-6 rounded-full overflow-hidden flex bg-muted">
                      {sd.chartData.map((item, i) => (
                        <div
                          key={i}
                          className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                            minWidth: Number(item.percentage) > 0 ? '8px' : '0',
                          }}
                        >
                          {Number(item.percentage) > 15 ? item.value : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center">
          {chartData.map(item => (
            <div
              key={item.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border"
            >
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm">
                {item.name}: {item.value} ({item.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attempt Quality Analysis</CardTitle>
        <CardDescription>
          Categorization of your attempt patterns: Perfect, Overtime, Wasted, or Confused
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Overall</TabsTrigger>
            <TabsTrigger value="physics">Physics</TabsTrigger>
            <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
            <TabsTrigger value="maths">Mathematics</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{renderSection('All')}</TabsContent>
          <TabsContent value="physics">{renderSection('Physics')}</TabsContent>
          <TabsContent value="chemistry">{renderSection('Chemistry')}</TabsContent>
          <TabsContent value="maths">{renderSection('Maths')}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
