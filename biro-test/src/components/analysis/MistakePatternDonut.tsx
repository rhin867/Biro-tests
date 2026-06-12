import React from 'react';
import { MistakeType } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { getMistakeTypeLabel, getMistakeTypeColor } from '@/lib/exam-utils';

interface MistakePatternDonutProps {
  mistakesByType: Record<MistakeType, number>;
  totalMistakes: number;
}

export function MistakePatternDonut({ mistakesByType, totalMistakes }: MistakePatternDonutProps) {
  const data = Object.entries(mistakesByType)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      name: getMistakeTypeLabel(type as MistakeType),
      value: count,
      color: getMistakeTypeColor(type as MistakeType),
      percentage: ((count / totalMistakes) * 100).toFixed(1),
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} questions ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Overview of Attempting Pattern</CardTitle>
          <CardDescription>Incorrect Questions Analysis</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">No mistake data recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Overview of Attempting Pattern</CardTitle>
        <CardDescription>Incorrect Questions Analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="flex flex-wrap gap-3 justify-center">
            {data.map((item) => (
              <div 
                key={item.name}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border"
              >
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm">
                  {item.name} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
