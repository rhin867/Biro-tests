import React, { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { getResults, getCurrentWeeklyPlan, saveWeeklyPlan } from '@/lib/storage';
import { calculateMistakeAnalysis } from '@/lib/exam-utils';
import { generateId } from '@/lib/storage';
import { WeeklyPlan, DailyTarget, PlanTask, Subject } from '@/types/exam';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Sparkles,
  Loader2,
  Target,
  BookOpen,
  Brain,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';

export default function StudyPlanner() {
  const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => {
    const plan = getCurrentWeeklyPlan();
    if (plan) setCurrentPlan(plan);
  }, []);

  const generateNewPlan = async () => {
    setIsGenerating(true);
    const results = getResults();

    if (results.length === 0) {
      toast.error('Complete some tests first to generate a study plan');
      setIsGenerating(false);
      return;
    }

    try {
      const mistakeAnalysis = calculateMistakeAnalysis(results);
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

      const analysisData = {
        recentResults: results.slice(-5).map((r) => ({
          testName: r.testName,
          score: r.score,
          maxScore: r.maxScore,
          accuracy: r.accuracy,
          subjectWise: r.subjectWise,
          chapterWise: r.chapterWise,
        })),
        mistakeAnalysis,
        totalTests: results.length,
      };

      const { data, error } = await supabase.functions.invoke('generate-study-plan', {
        body: {
          analysisData,
          weekStartDate: format(weekStart, 'yyyy-MM-dd'),
        },
      });

      if (error) throw error;

      const planData = data.weeklyPlan;

      const newPlan: WeeklyPlan = {
        id: generateId(),
        generatedAt: new Date().toISOString(),
        weekStartDate: format(weekStart, 'yyyy-MM-dd'),
        weekEndDate: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
        dailyTargets: planData.dailyTargets || createDefaultDailyTargets(weekStart),
        chapterPriority: planData.chapterPriority || [],
        formulaRevisionList: planData.formulaRevisionList || [],
        practiceTheoryRatio: planData.practiceTheoryRatio || 0.6,
      };

      saveWeeklyPlan(newPlan);
      setCurrentPlan(newPlan);
      toast.success('Study plan generated successfully!');
    } catch (error) {
      console.error('Failed to generate plan:', error);
      toast.error('Failed to generate plan. Using default template.');

      // Create fallback plan
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const fallbackPlan: WeeklyPlan = {
        id: generateId(),
        generatedAt: new Date().toISOString(),
        weekStartDate: format(weekStart, 'yyyy-MM-dd'),
        weekEndDate: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
        dailyTargets: createDefaultDailyTargets(weekStart),
        chapterPriority: [],
        formulaRevisionList: [],
        practiceTheoryRatio: 0.5,
      };
      saveWeeklyPlan(fallbackPlan);
      setCurrentPlan(fallbackPlan);
    } finally {
      setIsGenerating(false);
    }
  };

  const createDefaultDailyTargets = (weekStart: Date): DailyTarget[] => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.map((day, index) => ({
      day,
      date: format(addDays(weekStart, index), 'yyyy-MM-dd'),
      tasks: [],
      estimatedHours: 4,
      focus: ['Physics', 'Chemistry', 'Maths'] as Subject[],
    }));
  };

  const toggleTaskCompletion = (dayIndex: number, taskId: string) => {
    if (!currentPlan) return;

    const updatedPlan = { ...currentPlan };
    const task = updatedPlan.dailyTargets[dayIndex].tasks.find((t) => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      saveWeeklyPlan(updatedPlan);
      setCurrentPlan(updatedPlan);
    }
  };

  const getTaskIcon = (type: PlanTask['type']) => {
    switch (type) {
      case 'revision':
        return <BookOpen className="h-4 w-4" />;
      case 'practice':
        return <Target className="h-4 w-4" />;
      case 'test':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'formula':
        return <Brain className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-incorrect/20 text-incorrect border-incorrect/30';
      case 'medium':
        return 'bg-review/20 text-review border-review/30';
      case 'low':
        return 'bg-correct/20 text-correct border-correct/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Study Planner"
        description="AI-powered weekly study plan based on your performance"
      >
        <Button onClick={generateNewPlan} disabled={isGenerating} className="gap-2">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate New Plan
            </>
          )}
        </Button>
      </PageHeader>

      {!currentPlan ? (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Study Plan Yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate an AI-powered study plan based on your test performance
            </p>
            <Button onClick={generateNewPlan} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Day Selector - Mobile Horizontal Scroll / Desktop Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">This Week</CardTitle>
                <CardDescription>
                  {format(new Date(currentPlan.weekStartDate), 'MMM d')} -{' '}
                  {format(new Date(currentPlan.weekEndDate), 'MMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2">
                <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                  {currentPlan.dailyTargets.map((day, index) => {
                    const completedTasks = day.tasks.filter((t) => t.completed).length;
                    const totalTasks = day.tasks.length;
                    const isComplete = totalTasks > 0 && completedTasks === totalTasks;

                    return (
                      <button
                        key={day.day}
                        onClick={() => setSelectedDay(index)}
                        className={cn(
                          'flex-shrink-0 p-3 rounded-lg text-left transition-all min-w-[100px] lg:min-w-0',
                          selectedDay === index
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card hover:bg-accent border border-border'
                        )}
                      >
                        <div className="text-sm font-medium">{day.day.slice(0, 3)}</div>
                        <div className="text-xs opacity-80">
                          {format(new Date(day.date), 'MMM d')}
                        </div>
                        {totalTasks > 0 && (
                          <div className="text-xs mt-1">
                            {isComplete ? '✓ Done' : `${completedTasks}/${totalTasks}`}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Priority Chapters */}
            {currentPlan.chapterPriority.length > 0 && (
              <Card className="mt-4 hidden lg:block">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-review" />
                    Priority Chapters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {currentPlan.chapterPriority.slice(0, 5).map((cp, i) => (
                    <div
                      key={i}
                      className={cn(
                        'p-2 rounded-lg text-xs border',
                        getPriorityColor(cp.priority)
                      )}
                    >
                      <div className="font-medium">{cp.chapter}</div>
                      <div className="opacity-80">{cp.subject}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Day's Tasks */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{currentPlan.dailyTargets[selectedDay]?.day}</CardTitle>
                    <CardDescription>
                      {currentPlan.dailyTargets[selectedDay] &&
                        format(
                          new Date(currentPlan.dailyTargets[selectedDay].date),
                          'EEEE, MMMM d, yyyy'
                        )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {currentPlan.dailyTargets[selectedDay]?.estimatedHours || 0}h
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {currentPlan.dailyTargets[selectedDay]?.tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No tasks scheduled for this day</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentPlan.dailyTargets[selectedDay]?.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          'flex items-start gap-3 p-4 rounded-lg border transition-all',
                          task.completed
                            ? 'bg-correct/5 border-correct/30'
                            : 'bg-card border-border hover:border-primary/30'
                        )}
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTaskCompletion(selectedDay, task.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs',
                                `badge-${task.subject.toLowerCase()}`
                              )}
                            >
                              {getTaskIcon(task.type)}
                              {task.type}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {task.subject}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn('text-xs', getPriorityColor(task.priority))}
                            >
                              {task.priority}
                            </Badge>
                          </div>
                          <p
                            className={cn(
                              'text-sm',
                              task.completed && 'line-through text-muted-foreground'
                            )}
                          >
                            {task.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{task.chapter}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {task.duration}m
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Formula Revision */}
            {currentPlan.formulaRevisionList.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Formulas to Revise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {currentPlan.formulaRevisionList.map((f, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg border border-border bg-card/50 text-sm"
                      >
                        <div className="font-mono text-primary">{f.formula}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {f.subject} • {f.chapter}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
