import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

/**
 * StatsChart – Dashboard charts showing retention statistics.
 * - Pie chart: Remembered vs Forgot breakdown
 * - Bar chart: Lessons by status (Active / Completed)
 */

const COLORS = {
  remembered: '#E8736C',
  forgot: '#FF6B8A',
  active: '#4ECDC4',
  completed: '#6CB4EE',
  pending: '#FFD93D',
};

export default function StatsChart({ lessons, reminders }) {
  // ── Feedback stats ──
  const feedbackData = reminders.reduce(
    (acc, r) => {
      if (r.feedback === 'remembered') acc.remembered += 1;
      else if (r.feedback === 'forgot') acc.forgot += 1;
      else acc.pending += 1;
      return acc;
    },
    { remembered: 0, forgot: 0, pending: 0 }
  );

  const pieData = [
    { name: 'Remembered', value: feedbackData.remembered, color: COLORS.remembered },
    { name: 'Forgot', value: feedbackData.forgot, color: COLORS.forgot },
    { name: 'Pending', value: feedbackData.pending, color: COLORS.pending },
  ].filter((d) => d.value > 0);

  // ── Lesson status stats ──
  const lessonStats = lessons.reduce(
    (acc, l) => {
      if (l.status === 'completed') acc.completed += 1;
      else acc.active += 1;
      return acc;
    },
    { active: 0, completed: 0 }
  );

  const barData = [
    { name: 'Active', count: lessonStats.active, fill: COLORS.active },
    { name: 'Completed', count: lessonStats.completed, fill: COLORS.completed },
  ];

  // ── Overall stats ──
  const retentionRate =
    feedbackData.remembered + feedbackData.forgot > 0
      ? Math.round(
          (feedbackData.remembered /
            (feedbackData.remembered + feedbackData.forgot)) *
            100
        )
      : 0;

  const noData = lessons.length === 0;

  return (
    <section className="glass-card stats-card" id="stats-chart">
      <div className="card-header">
        <div className="card-icon">
          <BarChart3 size={20} />
        </div>
        <h2>Analytics</h2>
      </div>

      {noData ? (
        <div className="empty-state">
          <BarChart3 size={48} strokeWidth={1} />
          <p>Add lessons to see your learning analytics here!</p>
        </div>
      ) : (
        <>
          {/* Quick stats row */}
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-value">{lessons.length}</span>
              <span className="stat-label">Lessons</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{reminders.length}</span>
              <span className="stat-label">Reminders</span>
            </div>
            <div className="stat-item">
              <span className="stat-value highlight">{retentionRate}%</span>
              <span className="stat-label">Retention</span>
            </div>
          </div>

          <div className="charts-grid">
            {/* Feedback Pie */}
            {pieData.length > 0 && (
              <div className="chart-wrapper">
                <h3 className="chart-title">Feedback Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(20,20,40,0.9)',
                        border: '1px solid rgba(120,100,255,0.3)',
                        borderRadius: '8px',
                        color: '#e0e0ff',
                        fontFamily: 'Inter',
                        fontSize: '13px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--text-secondary)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Lesson Status Pie Chart */}
            <div className="chart-wrapper">
              <h3 className="chart-title">Completed Projects</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={barData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                    animationBegin={200}
                    animationDuration={800}
                  >
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(20,20,40,0.9)',
                      border: '1px solid rgba(120,100,255,0.3)',
                      borderRadius: '8px',
                      color: '#e0e0ff',
                      fontFamily: 'Inter',
                      fontSize: '13px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--text-secondary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
