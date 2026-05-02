import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Search, ListTodo } from 'lucide-react';

const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done' };

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });

  const fetchTasks = () => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.search) params.search = filters.search;
    api.get('/tasks', { params }).then(res => setTasks(res.data.tasks)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, [filters.status, filters.priority]);
  useEffect(() => { const t = setTimeout(fetchTasks, 300); return () => clearTimeout(t); }, [filters.search]);

  const statusBadge = (s) => {
    const m = { TODO: 'badge-todo', IN_PROGRESS: 'badge-progress', IN_REVIEW: 'badge-review', DONE: 'badge-done' };
    return <span className={`badge ${m[s]}`}>{STATUS_LABELS[s]}</span>;
  };

  const priorityBadge = (p) => {
    const m = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high', URGENT: 'badge-urgent' };
    return <span className={`badge ${m[p]}`}>{p}</span>;
  };

  if (loading) return <div className="page-container"><div className="loading-screen"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1>All Tasks</h1><p>View and filter tasks across all projects</p></div>
      </div>

      <div className="filters-bar">
        <div className="search-wrapper">
          <Search size={16} />
          <input type="text" className="search-input" placeholder="Search tasks..."
            value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
        </div>
        <select className="filter-select" value={filters.status}
          onChange={e => setFilters({...filters, status: e.target.value})}>
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="DONE">Done</option>
        </select>
        <select className="filter-select" value={filters.priority}
          onChange={e => setFilters({...filters, priority: e.target.value})}>
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {tasks.length > 0 ? (
        <div className="task-list">
          {tasks.map(task => (
            <div key={task.id} className="task-item" onClick={() => navigate(`/projects/${task.projectId}`)}>
              <div className="task-info">
                <div className="task-title">{task.title}</div>
                <div className="task-meta">
                  <span style={{ color: task.project?.color, fontWeight: 500 }}>{task.project?.name}</span>
                  {task.assignee && <span>→ {task.assignee.name}</span>}
                  {task.dueDate && (
                    <span style={{ color: new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'var(--danger)' : 'inherit' }}>
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {priorityBadge(task.priority)}
                {statusBadge(task.status)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ListTodo size={64} />
          <h3>No tasks found</h3>
          <p>{filters.search || filters.status || filters.priority ? 'Try adjusting your filters' : 'Create a project and start adding tasks'}</p>
        </div>
      )}
    </div>
  );
}
