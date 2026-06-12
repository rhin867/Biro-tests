import React from 'react';
import { Link } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/exam/StatCard';
import { MultiProgressBar } from '@/components/exam/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTests, getResults } from '@/lib/storage';
import {
  Target,
  TrendingUp,
  Clock,
  BookOpen,
  Plus,
  ChevronRight,
  FileText,
  BarChart,
} from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function Dashboard() {
  const tests = getTests();
  const results = getResults();

  // Calculate overall stats
  const totalTests = tests.length;
  const totalAttempts = results.length;
  const avgAccuracy =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.accuracy, 0) / results.length
      : 0;
  const avgScore =
    results.length > 0
      ? results.reduce((sum, r) => sum + (r.score / r.maxScore) * 100, 0) / results.length
      : 0;

  // Recent results for chart
  const recentResults = results.slice(-5).map((r) => ({
    name: r.testName.substring(0, 15),
    score: Math.round((r.score / r.maxScore) * 100),
    accuracy: Math.round(r.accuracy),
  }));

  // Subject distribution from latest result
  const latestResult = results[results.length - 1];
  const subjectData = latestResult
    ? [
        {
          name: 'Physics',
          value: latestResult.subjectWise.Physics.correct,
          color: 'hsl(199, 89%, 48%)',
        },
        {
          name: 'Chemistry',
          value: latestResult.subjectWise.Chemistry.correct,
          color: 'hsl(142, 76%, 36%)',
        },
        {
          name: 'Maths',
          value: latestResult.subjectWise.Maths.correct,
          color: 'hsl(280, 65%, 60%)',
        },
      ]
    : [];

  return (
    <MainLayout>
      <PageHeader
        title="Dashboard"
        description="Track your JEE preparation progress"
      >
        <Link to="/create">
          <Button className="gap-2 glow-primary">
            <Plus className="h-4 w-4" />
            Create New Test
          </Button>
        </Link>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Tests"
          value={totalTests}
          icon={FileText}
          subtitle="Tests created"
          variant="primary"
        />
        <StatCard
          title="Tests Attempted"
          value={totalAttempts}
          icon={Target}
          subtitle="Completed attempts"
        />
        <StatCard
          title="Avg. Accuracy"
          value={`${avgAccuracy.toFixed(1)}%`}
          icon={TrendingUp}
          variant={avgAccuracy >= 60 ? 'correct' : 'incorrect'}
          subtitle={avgAccuracy >= 60 ? 'Good performance' : 'Needs improvement'}
        />
        <StatCard
          title="Avg. Score"
          value={`${avgScore.toFixed(1)}%`}
          icon={BarChart}
          subtitle="Overall score"
        />
      </div>

      {/* Quick Actions & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Get started with your practice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/create" className="block">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Upload PDF</p>
                    <p className="text-xs text-muted-foreground">Create test from PDF</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            </Link>
            <Link to="/tests" className="block">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-physics/10 p-2">
                    <FileText className="h-5 w-5 text-physics" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">My Tests</p>
                    <p className="text-xs text-muted-foreground">View all tests</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            </Link>
            <Link to="/mistakes" className="block">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-review/10 p-2">
                    <BookOpen className="h-5 w-5 text-review" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Mistake Book</p>
                    <p className="text-xs text-muted-foreground">Review mistakes</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Performance Trend</CardTitle>
            <CardDescription>Score and accuracy over recent tests</CardDescription>
          </CardHeader>
          <CardContent>
            {recentResults.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RechartsBarChart data={recentResults}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Score %" />
                  <Bar dataKey="accuracy" fill="hsl(var(--correct))" radius={[4, 4, 0, 0]} name="Accuracy %" />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                <p>No test data yet. Create and attempt a test to see performance trends.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subject Distribution & Recent Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subject Distribution</CardTitle>
            <CardDescription>Correct answers by subject (latest test)</CardDescription>
          </CardHeader>
          <CardContent>
            {subjectData.length > 0 && subjectData.some(d => d.value > 0) ? (
              <div className="flex items-center justify-center gap-8">
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie
                      data={subjectData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {subjectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {subjectData.map((subject) => (
                    <div key={subject.name} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: subject.color }}
                      />
                      <span className="text-sm">{subject.name}</span>
                      <span className="text-sm font-medium">{subject.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[150px] items-center justify-center text-muted-foreground">
                <p>Complete a test to see subject distribution</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest test attempts</CardDescription>
            </div>
            <Link to="/history">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="space-y-4">
                {results.slice(-3).reverse().map((result) => (
                  <div
                    key={result.attemptId}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{result.testName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(result.completedAt).toLocaleDateString()}
                      </p>
                      <MultiProgressBar
                        segments={[
                          { value: result.correct, variant: 'correct' },
                          { value: result.incorrect, variant: 'incorrect' },
                          { value: result.skipped, variant: 'skipped' },
                        ]}
                        total={result.totalQuestions}
                        size="sm"
                        className="mt-2"
                      />
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-primary">
                        {result.score}/{result.maxScore}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.accuracy.toFixed(1)}% accuracy
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[150px] items-center justify-center text-muted-foreground">
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
