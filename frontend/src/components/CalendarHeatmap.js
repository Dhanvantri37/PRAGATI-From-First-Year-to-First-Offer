import React, { useState, useMemo } from 'react';

export default function CalendarHeatmap({ submissions = [], heatmapProp = null, title = "📊 Problem Solving Heatmap", subtitle = "Record of coding activities for a 1-year period", currentStreak, maxStreak, noCard = false }) {
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear().toString());

  const heatmapMap = useMemo(() => {
    if (heatmapProp) return heatmapProp;
    const map = {};
    if (Array.isArray(submissions)) {
      submissions.forEach(d => {
        if (!d) return;
        try {
          const dateStr = typeof d === 'string' ? d.split('T')[0] : new Date(d).toISOString().split('T')[0];
          map[dateStr] = (map[dateStr] || 0) + 1;
        } catch (e) {
          // ignore invalid dates
        }
      });
    }
    return map;
  }, [submissions, heatmapProp]);

  const heatmapGridData = useMemo(() => {
    const year = parseInt(heatmapYear) || new Date().getFullYear();
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const days = isLeap ? 366 : 365;
    const grid = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(year, 0, i + 1);
      // Need to handle timezone issues correctly for dates, avoiding shift
      // Using local time to construct the string
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const count = heatmapMap[dateStr] || 0;
      grid.push({ date: dateStr, count, month: d.toLocaleString('en-US', { month: 'short' }) });
    }
    return grid;
  }, [heatmapMap, heatmapYear]);

  return (
    <div style={noCard ? {} : { background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:16, padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:10 }}>
        <div>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.92rem', textTransform:'uppercase', color:'var(--text-2)', margin:0 }}>{title}</h3>
          {subtitle && <span style={{ fontSize:'.7rem', color:'var(--text-3)' }}>{subtitle}</span>}
        </div>
        <select value={heatmapYear} onChange={e=>setHeatmapYear(e.target.value)} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--background)', color:'var(--text)', fontWeight:800, fontSize:'.75rem' }}>
          {[2026, 2027, 2028, 2029, 2030, 2031, 2032].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      
      {/* Renders dynamic board */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, padding:14, background:'rgba(255,255,255,0.01)', borderRadius:12, overflowX:'auto' }}>
        <div style={{ display:'flex', gap:2 }}>
          {(() => {
            // Group heatmap data by month
            const months = {};
            heatmapGridData.forEach(d => {
              if (!months[d.month]) months[d.month] = [];
              months[d.month].push(d);
            });
            return Object.keys(months).map(month => (
              <div key={month} style={{ flex:1, display:'flex', flexDirection:'column', gap:6, minWidth:70 }}>
                <div style={{ fontSize:'.7rem', color:'var(--text-3)', fontWeight:800, textAlign:'center' }}>{month}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:3, justifyContent:'center' }}>
                  {months[month].map((d, idx) => {
                    let bgColor = 'var(--border)';
                    if (d.count === 1) bgColor = 'rgba(168,85,247,0.25)';
                    if (d.count === 2) bgColor = 'rgba(168,85,247,0.5)';
                    if (d.count >= 3) bgColor = 'rgba(168,85,247,0.85)';
                    return (
                      <div key={idx} title={`${d.date} : ${d.count} submissions`} style={{ width:12, height:12, borderRadius:3, background:bgColor, cursor:'crosshair' }} />
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
          {currentStreak !== undefined && (
            <span style={{ fontSize:'.72rem', color:'var(--text-3)' }}>
              Current Streak <strong style={{ color:'var(--purple, #a855f7)' }}>{currentStreak} Days</strong>
            </span>
          )}
          {maxStreak !== undefined && (
            <span style={{ fontSize:'.72rem', color:'var(--text-3)' }}>
              Max Streak <strong style={{ color:'var(--text)' }}>{maxStreak} Days</strong>
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:10, fontSize:'.68rem', color:'var(--text-3)' }}>
          <span>Less</span>
          <div style={{ display:'flex', gap:2, alignItems:'center' }}>
            <div style={{ width:10, height:10, background:'var(--border)', borderRadius:1 }} />
            <div style={{ width:10, height:10, background:'rgba(168,85,247,0.25)', borderRadius:1 }} />
            <div style={{ width:10, height:10, background:'rgba(168,85,247,0.55)', borderRadius:1 }} />
            <div style={{ width:10, height:10, background:'rgba(168,85,247,0.9)', borderRadius:1 }} />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
