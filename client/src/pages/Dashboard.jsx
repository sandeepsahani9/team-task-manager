import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { FolderKanban, ListTodo, Users, AlertTriangle, Clock, CheckCircle2, Circle, Loader } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_COLORS = { todo: '#94a3b8', inProgress: '#3b82f6', inReview: '#f59e0b', done: '#10b981' };
const PRIORITY_COLORS = { low: '#94a3b8', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => setData(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container"><div className="loading-screen"><div className="spinner" /></div></div>;

  const pieData = data ? [
    { name: 'To Do', value: data.statusStats.todo, color: STATUS_COLORS.todo },
    { name: 'In Progress', value: data.statusStats.inProgress, color: STATUS_COLORS.inProgress },
    { name: 'In Review', value: data.statusStats.inReview, color: STATUS_COLORS.inReview },
    { name: 'Done', value: data.statusStats.done, color: STATUS_COLORS.done },
  ].filter(d => d.value > 0) : [];

  const barData = data ? [
    { name: 'Low', value: data.priorityStats.low, fill: PRIORITY_COLORS.low },
    { name: 'Medium', value: data.priorityStats.medium, fill: PRIORITY_COLORS.medium },
    { name: 'High', value: data.priorityStats.high, fill: PRIORITY_COLORS.high },
    { name: 'Urgent', value: data.priorityStats.urgent, fill: PRIORITY_COLORS.urgent },
  ] : [];

  const statusBadge = (status) => {
    const map = { TODO: 'badge-todo', IN_PROGRESS: 'badge-progress', IN_REVIEW: 'badge-review', DONE: 'badge-done' };
    const labels = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done' };
    return <span className={`badge ${map[status]}`}>{labels[status]}</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Here's what's happening with your projects</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple"><FolderKanban size={22} /></div>
          <div className="stat-value">{data?.stats?.totalProjects || 0}</div>
          <div className="stat-label">Projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><ListTodo size={22} /></div>
          <div className="stat-value">{data?.stats?.totalTasks || 0}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle2 size={22} /></div>
          <div className="stat-value">{data?.stats?.myTasks || 0}</div>
          <div className="stat-label">My Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><Users size={22} /></div>
          <div className="stat-value">{data?.stats?.totalMembers || 0}</div>
          <div className="stat-label">Team Members</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><AlertTriangle size={22} /></div>
          <div className="stat-value">{data?.stats?.overdue || 0}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Tasks by Status</h3></div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No tasks yet</p></div>}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#94a3b8' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Tasks by Priority</h3></div>
          {barData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#e2e8f0' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No tasks yet</p></div>}
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} style={{ color: 'var(--danger)' }} /> Overdue Tasks
            </h3>
          </div>
          {data?.overdueTasks?.length > 0 ? (
            <div className="task-list">
              {data.overdueTasks.map(task => (
                <div key={task.id} className="task-item" onClick={() => navigate(`/projects/${task.projectId}`)}>
                  <div className="task-info">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span style={{ color: task.project?.color }}>{task.project?.name}</span>
                      <span style={{ color: 'var(--danger)' }}>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {statusBadge(task.status)}
                </div>
              ))}
            </div>
          ) : <div className="empty-state"><CheckCircle2 size={40} /><p>No overdue tasks! 🎉</p></div>}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} style={{ color: 'var(--info)' }} /> Recent Activity
            </h3>
          </div>
          {data?.recentTasks?.length > 0 ? (
            <div className="task-list">
              {data.recentTasks.slice(0, 6).map(task => (
                <div key={task.id} className="task-item" onClick={() => navigate(`/projects/${task.projectId}`)}>
                  <div className="task-info">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span style={{ color: task.project?.color }}>{task.project?.name}</span>
                      {task.assignee && <span>→ {task.assignee.name}</span>}
                    </div>
                  </div>
                  {statusBadge(task.status)}
                </div>
              ))}
            </div>
          ) : <div className="empty-state"><Circle size={40} /><p>No recent activity</p></div>}
        </div>
      </div>
    </div>
  );
}
