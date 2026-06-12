import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { NTAModeToggle } from '@/components/exam/NTAModeToggle';
import {
  LayoutDashboard, Plus, FileText, History, BookOpen, Calendar, Download,
  GraduationCap, Menu, X, Target, Settings, MessageSquare, Shield,
  ExternalLink, HelpCircle, Bot, Globe,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/create', label: 'Create Test', icon: Plus },
  { path: '/tests', label: 'My Tests', icon: FileText },
  { path: '/public-tests', label: 'Public Tests', icon: Globe },
  { path: '/history', label: 'History', icon: History },
  { path: '/mistakes', label: 'Mistake Book', icon: BookOpen },
  { path: '/goal', label: 'Goal Tracker', icon: Target },
  { path: '/biro-brain', label: 'Biro-Brain AI', icon: Bot },
  { path: '/external-analysis', label: 'External Analysis', icon: ExternalLink },
  { path: '/plan', label: 'Study Planner', icon: Calendar },
  { path: '/community', label: 'Community', icon: MessageSquare },
  { path: '/guide', label: 'Guide', icon: HelpCircle },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/export', label: 'Export/Import', icon: Download },
];

interface SidebarProps { className?: string; }

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-6 border-b border-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">Biro Test</span>
          <span className="text-xs text-muted-foreground">CBT Analyzer</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={() => isMobile && setIsOpen(false)}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3 space-y-2">
        <div className="px-3 py-2"><NTAModeToggle /></div>
        <Link to="/admin">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
            <Shield className="h-4 w-4" /> Admin
          </Button>
        </Link>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Biro Test</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsOpen(false)} />
            <div className="fixed left-0 top-14 bottom-0 z-50 w-64 bg-background border-r border-border">
              <NavContent />
            </div>
          </>
        )}
        <div className="h-14" />
      </>
    );
  }

  return (
    <aside className={cn("fixed left-0 top-0 bottom-0 z-30 w-56 border-r border-border bg-background/95 backdrop-blur-sm hidden md:block", className)}>
      <NavContent />
    </aside>
  );
}
