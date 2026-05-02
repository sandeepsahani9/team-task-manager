import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Plus, FolderKanban, ListTodo, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });
  const [saving, setSaving] = useState(false);

  const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6','#06b6d4','#3b82f6'];

  const fetchProjects = () => {
    api.get('/projects').then(res => setProjects(res.data.projects)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/projects', form);
      toast.success('Project created!');
      setShowModal(false);
      setForm({ name: '', description: '', color: '#6366f1' });
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="page-container"><div className="loading-screen"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1>Projects</h1><p>Manage your team projects</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Project
        </button>
      </div>

      {projects.length > 0 ? (
        <div className="projects-grid">
          {projects.map(project => {
            const progress = project.taskStats?.total > 0
              ? Math.round((project.taskStats.done / project.taskStats.total) * 100) : 0;

            return (
              <div key={project.id} className="project-card" onClick={() => navigate(`/projects/${project.id}`)}
                style={{ '--card-color': project.color }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: project.color }} />
                <div className="project-name">{project.name}</div>
                <div className="project-desc">{project.description || 'No description'}</div>
                <div className="project-meta">
                  <span><ListTodo size={14} /> {project.taskStats?.total || 0} tasks</span>
                  <span><Users size={14} /> {project.teamMembers?.length || 0} members</span>
                </div>
                <div className="members-row">
                  {project.teamMembers?.slice(0, 4).map(m => (
                    <div key={m.id} className="avatar avatar-sm" title={m.user.name}>
                      {m.user.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {project.teamMembers?.length > 4 && (
                    <div className="avatar avatar-sm" style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                      +{project.teamMembers.length - 4}
                    </div>
                  )}
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%`, background: project.color }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>
                  {progress}% complete
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <FolderKanban size={64} />
          <h3>No projects yet</h3>
          <p>Create your first project to start managing tasks</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Create Project
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Project</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Project Name *</label>
                <input type="text" className="form-input" placeholder="My awesome project"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-input" rows={3} placeholder="What's this project about?"
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  style={{ resize: 'vertical', minHeight: 80 }} />
              </div>
              <div className="form-group">
                <label>Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setForm({...form, color: c})}
                      style={{ width: 32, height: 32, borderRadius: 8, background: c, border: form.color === c ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer', transition: 'transform 0.15s', transform: form.color === c ? 'scale(1.15)' : 'scale(1)' }} />
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
