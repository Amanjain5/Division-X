'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AppShell } from '../../components/app-shell';
import { Toast } from '../../components/toast';
import { getTimeEntries, getWorkspace, getCatalog } from '@divisionx/api-client';

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getTimelineRange(offset: number): { start: Date; end: Date; days: Date[] } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setDate(now.getDate() - 7 + offset * 14); 
  const days: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  const end = new Date(days[days.length - 1]);
  end.setHours(23, 59, 59, 999);
  return { start, end, days };
}

export default function TimesheetPage() {
  const [items, setItems] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const range = useMemo(() => getTimelineRange(offset), [offset]);
  const columnWidth = 220; // Even wider for tags and details
  const sidebarWidth = 280;

  const refresh = useCallback(async () => {
    try {
      const [entriesData, workspaceData, tagsData] = await Promise.all([
        getTimeEntries({ from: range.start.toISOString(), to: range.end.toISOString(), pageSize: 1000 }),
        getWorkspace(),
        getCatalog('tags')
      ]);
      setItems(entriesData.items);
      setMembers(workspaceData.members);
      setAllTags(tagsData.items);
    } catch {
      setToast({ text: 'Failed to load timeline data', type: 'error' });
    }
  }, [range]);

  useEffect(() => { refresh(); }, [refresh]);

  // Aggregation Logic: Project -> Day Summary (with Tags and Descriptions)
  const aggregatedData = useMemo(() => {
    const projects: Record<string, { id: string; name: string; color: string; days: Record<string, any> }> = {};
    
    items.forEach(item => {
      const pId = item.project?.id || 'unassigned';
      const dateKey = new Date(item.startedAt).toISOString().split('T')[0];
      
      if (!projects[pId]) {
        projects[pId] = {
          id: pId,
          name: item.project?.name || 'General Tasks',
          color: item.project?.color || '#10b981',
          days: {}
        };
      }
      
      if (!projects[pId].days[dateKey]) {
        projects[pId].days[dateKey] = {
          totalMs: 0,
          descriptions: new Set<string>(),
          users: new Set<string>(),
          tags: new Set<string>()
        };
      }
      
      const duration = (item.endedAt ? new Date(item.endedAt).getTime() : Date.now()) - new Date(item.startedAt).getTime();
      projects[pId].days[dateKey].totalMs += duration;
      if (item.description) projects[pId].days[dateKey].descriptions.add(item.description);
      projects[pId].days[dateKey].users.add(item.userId);
      if (item.tagId) projects[pId].days[dateKey].tags.add(item.tagId);
    });

    return Object.values(projects).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  return (
    <AppShell title="Visual Timesheet">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        
        {/* Modern Interactive Header */}
        <div className="flex items-end justify-between mb-10">
          <div className="space-y-1">
            <h1 className="text-5xl font-black text-white tracking-tighter italic leading-none">
              TIMELINE<span className="text-primary opacity-50">.</span>
            </h1>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.2em] rounded">Live Overview</span>
              <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Resource Analysis & Project Mapping</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-white/[0.02] p-2 rounded-2xl border border-white/5 backdrop-blur-xl">
            <div className="flex gap-1">
              <button onClick={() => setOffset(o => o - 1)} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={() => setOffset(0)} className="px-5 h-10 flex items-center justify-center text-white/80 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all hover:bg-white/5 rounded-xl">
                Current
              </button>
              <button onClick={() => setOffset(o => o + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Master Timeline Grid */}
        <div className="relative bg-[#03110b] rounded-[3rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden">
          <div ref={scrollRef} className="overflow-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div style={{ width: (columnWidth * 14) + sidebarWidth, minHeight: '100%' }}>
              
              {/* STICKY COLUMN HEADERS */}
              <div className="flex sticky top-0 z-50 bg-[#03110b]/90 backdrop-blur-3xl border-b border-white/5">
                <div className="shrink-0 sticky left-0 z-[60] bg-[#03110b] flex items-center px-12 border-r border-white/5" style={{ width: sidebarWidth, height: 110 }}>
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/10">Project Engine</span>
                </div>
                <div className="flex">
                  {range.days.map((day, i) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <div key={i} className={`shrink-0 flex flex-col items-center justify-center border-r border-white/5 transition-all ${isToday ? 'bg-primary/10' : isWeekend ? 'bg-white/[0.01]' : ''}`} style={{ width: columnWidth, height: 110 }}>
                        <span className={`text-[8px] font-black uppercase tracking-[0.3em] mb-2 ${isToday ? 'text-primary' : 'text-white/20'}`}>
                          {day.toLocaleDateString('en-US', { weekday: 'long' })}
                        </span>
                        <span className={`text-3xl font-black ${isToday ? 'text-white drop-shadow-[0_0_10px_var(--primary)]' : 'text-white/50'}`}>
                          {day.getDate()}
                        </span>
                        {isToday && <div className="mt-3 w-8 h-1 rounded-full bg-primary shadow-[0_0_15px_var(--primary)]" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PROJECT ROWS */}
              <div className="relative">
                {aggregatedData.map((project) => (
                  <div key={project.id} className="flex border-b border-white/5 group transition-all hover:bg-white/[0.005]">
                    {/* Project Info Sidebar */}
                    <div className="shrink-0 sticky left-0 z-40 bg-[#03110b]/95 backdrop-blur-2xl px-12 py-10 border-r border-white/5 flex flex-col justify-center" style={{ width: sidebarWidth }}>
                      <div className="flex items-center gap-6 group/side">
                        <div className="w-1.5 h-12 rounded-full transition-all group-hover/side:scale-y-110 shadow-[0_0_20px_rgba(0,0,0,0.5)]" style={{ backgroundColor: project.color }} />
                        <div className="min-w-0">
                          <div className="text-sm font-black text-white uppercase tracking-tight truncate leading-tight group-hover/side:text-primary transition-colors">{project.name}</div>
                          <div className="text-[9px] text-white/20 font-bold mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-primary" /> {Object.keys(project.days).length} Active Segments
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Day Cells */}
                    <div className="flex">
                      {range.days.map((day, i) => {
                        const dateKey = day.toISOString().split('T')[0];
                        const dayData = project.days[dateKey];
                        const isToday = day.toDateString() === new Date().toDateString();

                        return (
                          <div key={i} className={`shrink-0 p-5 border-r border-white/5 flex items-center justify-center transition-all ${isToday ? 'bg-primary/[0.015]' : ''}`} style={{ width: columnWidth }}>
                            {dayData ? (
                              <div className="w-full group/card relative">
                                {/* Glow backdrop */}
                                <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover/card:opacity-20 transition-all duration-500" style={{ backgroundColor: project.color }} />
                                
                                <div className="relative min-h-[120px] w-full rounded-[2rem] bg-white/[0.03] border border-white/5 p-5 flex flex-col justify-between transition-all group-hover/card:bg-white/[0.05] group-hover/card:border-white/10 group-hover/card:-translate-y-2 shadow-2xl"
                                     style={{ borderLeft: `5px solid ${project.color}` }}>
                                  
                                  {/* Header: Duration & Avatars */}
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-black text-white uppercase tracking-tighter">{formatDuration(dayData.totalMs)}</span>
                                    <div className="flex -space-x-2.5">
                                      {Array.from(dayData.users).map((uId: any, idx) => {
                                        const member = members.find(m => m.id === uId);
                                        const initial = member ? member.name[0] : '?';
                                        return (
                                          <div key={uId} className="w-6 h-6 rounded-full bg-[#03110b] border border-white/10 flex items-center justify-center text-[9px] font-black text-white/80 uppercase shadow-xl" style={{ zIndex: 10 - idx }}>
                                            {initial}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Middle: Description Sample */}
                                  <div className="mb-3">
                                    <p className="text-[10px] font-bold text-white/40 uppercase leading-tight line-clamp-2 italic">
                                      {(Array.from(dayData.descriptions)[0] as string) || 'Unlabeled Activity'}
                                    </p>
                                  </div>

                                  {/* Footer: Tags */}
                                  <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-white/5">
                                    {Array.from(dayData.tags).slice(0, 3).map((tId: any) => {
                                      const tag = allTags.find(t => t.id === tId);
                                      if (!tag) return null;
                                      return (
                                        <span key={tId} className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-white/40" style={{ borderColor: `${tag.color}44`, color: tag.color }}>
                                          {tag.name}
                                        </span>
                                      );
                                    })}
                                    {dayData.tags.size > 3 && <span className="text-[7px] font-bold text-white/20">+{dayData.tags.size - 3} More</span>}
                                    {dayData.tags.size === 0 && <span className="text-[7px] font-bold text-white/10 uppercase italic tracking-tighter">No Tags</span>}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-white/[0.03]" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* ENHANCED EMPTY STATE */}
                {aggregatedData.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-52">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-[100px] animate-pulse" />
                      <div className="relative text-[120px] font-black text-white/[0.02] uppercase tracking-[0.2em] leading-none select-none">
                        EMPTY
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">No synchronization detected</p>
                      <div className="w-12 h-0.5 bg-white/5 rounded-full" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast message={toast?.text || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 50px;
          border: 3px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.08);
        }
      `}</style>
    </AppShell>
  );
}
