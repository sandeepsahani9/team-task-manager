import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Plus, ArrowLeft, UserPlus, Trash2, Settings, ListTodo, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done' };
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [userRole, setUserRole] = useState('MEMBER');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '', assigneeId: '' });
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [saving, setSaving] = useState(false);

  const fetchProject = () => {
    api.get(`/projects/${id}`).then(res => {
      setProject(res.data.project);
      setUserRole(res.data.userRole);
    }).catch(() => navigate('/projects')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProject(); }, [id]);

  const isAdmin = userRole === 'ADMIN';

  const openCreateTask = () => {
    setEditTask(null);
    setTaskForm({ title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '', assigneeId: '' });
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditTask(task);
    setTaskForm({
      title: task.title, description: task.description || '', status: task.status,
      priority: task.priority, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '', assigneeId: task.assigneeId || '',
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...taskForm, projectId: id, assigneeId: taskForm.assigneeId || null, dueDate: taskForm.dueDate || null };
      if (editTask) {
        await api.put(`/tasks/${editTask.id}`, payload);
        toast.success('Task updated');
      } else {
        await api.post('/tasks', payload);
        toast.success('Task created');
      }
      setShowTaskModal(false);
      fetchProject();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      fetchProject();
    } catch { toast.error('Failed to update status'); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try { await api.delete(`/tasks/${taskId}`); toast.success('Deleted'); fetchProject(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/teams/${id}/members`, { email: memberEmail, role: memberRole });
      toast.success('Member added');
      setMemberEmail('');
      setShowMemberModal(false);
      fetchProject();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member?')) return;
    try { await api.delete(`/teams/${id}/members/${memberId}`); toast.success('Removed'); fetchProject(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project and all its tasks? This cannot be undone.')) return;
    try { await api.delete(`/projects/${id}`); toast.success('Project deleted'); navigate('/projects'); }
    catch { toast.error('Failed to delete project'); }
  };

  const statusBadge = (s) => {
    const m = { TODO: 'badge-todo', IN_PROGRESS: 'badge-progress', IN_REVIEW: 'badge-review', DONE: 'badge-done' };
    return <span className={`badge ${m[s]}`}>{STATUS_LABELS[s]}</span>;
  };

  const priorityBadge = (p) => {
    const m = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high', URGENT: 'badge-urgent' };
    return <span className={`badge ${m[p]}`}>{p}</span>;
  };

  if (loading) return <div className="page-container"><div className="loading-screen"><div className="spinner" /></div></div>;
  if (!project) return null;

  const tasksByStatus = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = project.tasks?.filter(t => t.status === s) || [];
    return acc;
  }, {});

  const allMembers = [
    { userId: project.owner.id, user: project.owner, role: 'ADMIN', isOwner: true },
    ...(project.teamMembers || []).filter(m => m.userId !== project.owner.id).map(m => ({ ...m, isOwner: false })),
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn-icon" onClick={() => navigate('/projects')}><ArrowLeft size={18} /></button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: project.color, display: 'inline-block' }} />
              {project.name}
            </h1>
            <p>{project.description || 'No description'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => setShowMemberModal(true)}><UserPlus size={16} /> Add Member</button>}
          <button className="btn btn-primary btn-sm" onClick={openCreateTask}><Plus size={16} /> New Task</button>
          {isAdmin && <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}><Trash2 size={16} /></button>}
        </div>
      </div>

      {/* View Toggle & Members */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <button className={`tab ${view === 'board' ? 'active' : ''}`} onClick={() => setView('board')}><LayoutGrid size={16} style={{ marginRight: 6 }} /> Board</button>
          <button className={`tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}><ListTodo size={16} style={{ marginRight: 6 }} /> List</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Team:</span>
          <div className="members-row">
            {allMembers.slice(0, 6).map((m, i) => (
              <div key={m.userId || i} className="avatar avatar-sm" title={`${m.user.name} (${m.isOwner ? 'Owner' : m.role})`}>
                {m.user.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban Board View */}
      {view === 'board' && (
        <div className="kanban-board">
          {STATUS_ORDER.map(status => (
            <div key={status} className="kanban-column">
              <div className="kanban-column-header">
                <span className="kanban-column-title">{STATUS_LABELS[status]}</span>
                <span className="kanban-count">{tasksByStatus[status].length}</span>
              </div>
              {tasksByStatus[status].map(task => (
                <div key={task.id} className="kanban-card" onClick={() => openEditTask(task)}>
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">
                    {priorityBadge(task.priority)}
                    {task.dueDate && <span style={{ color: new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'var(--danger)' : 'inherit' }}>
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>}
                    {task.assignee && <div className="avatar avatar-sm" style={{ width: 22, height: 22, fontSize: '0.6rem' }}>{task.assignee.name.charAt(0)}</div>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="task-list">
          {project.tasks?.length > 0 ? project.tasks.map(task => (
            <div key={task.id} className="task-item" onClick={() => openEditTask(task)}>
              <div className="task-info">
                <div className="task-title">{task.title}</div>
                <div className="task-meta">
                  {task.assignee && <span>→ {task.assignee.name}</span>}
                  {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {priorityBadge(task.priority)}
                {statusBadge(task.status)}
              </div>
            </div>
          )) : <div className="empty-state"><p>No tasks yet. Create your first task!</p></div>}
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editTask ? 'Edit Task' : 'Create New Task'}</h2>
            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label>Title *</label>
                <input type="text" className="form-input" value={taskForm.title}
                  onChange={e => setTaskForm({...taskForm, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-input" rows={3} value={taskForm.description}
                  onChange={e => setTaskForm({...taskForm, description: e.target.value})}
                  style={{ resize: 'vertical', minHeight: 80 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-input" value={taskForm.status}
                    onChange={e => setTaskForm({...taskForm, status: e.target.value})}>
                    {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select className="form-input" value={taskForm.priority}
                    onChange={e => setTaskForm({...taskForm, priority: e.target.value})}>
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" className="form-input" value={taskForm.dueDate}
                    onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Assignee</label>
                  <select className="form-input" value={taskForm.assigneeId}
                    onChange={e => setTaskForm({...taskForm, assigneeId: e.target.value})}>
                    <option value="">Unassigned</option>
                    {allMembers.map(m => <option key={m.userId} value={m.userId}>{m.user.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                {editTask && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => { handleDeleteTask(editTask.id); setShowTaskModal(false); }}
                    style={{ marginRight: 'auto' }}>
                    <Trash2 size={14} /> Delete
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editTask ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Team Member</h2>
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" className="form-input" placeholder="member@example.com"
                  value={memberEmail} onChange={e => setMemberEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select className="form-input" value={memberRole} onChange={e => setMemberRole(e.target.value)}>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMemberModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Adding...' : 'Add Member'}</button>
              </div>
            </form>

            <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>Current Members</h3>
              {allMembers.map((m, i) => (
                <div key={m.userId || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="avatar avatar-sm">{m.user.name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{m.user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.user.email}</div>
                  </div>
                  <span className={`badge ${m.role === 'ADMIN' ? 'badge-admin' : 'badge-member'}`}>
                    {m.isOwner ? 'Owner' : m.role}
                  </span>
                  {!m.isOwner && isAdmin && m.userId !== user.id && (
                    <button className="btn-icon btn-sm" onClick={() => handleRemoveMember(m.id)} style={{ padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
