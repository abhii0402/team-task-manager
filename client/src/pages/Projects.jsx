import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { HiOutlinePlus, HiOutlineFolder, HiOutlineUserGroup } from 'react-icons/hi';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const fetchProjects = () => {
    API.get('/projects').then(res => setProjects(res.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await API.post('/projects', form);
      addToast('Project created!');
      setShowModal(false);
      setForm({ name: '', description: '' });
      fetchProjects();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create project.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><HiOutlinePlus /> New Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="card empty-state">
          <HiOutlineFolder />
          <h3>No projects yet</h3>
          <p>Create your first project to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><HiOutlinePlus /> Create Project</button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => {
            const total = p.taskCounts?.total || 0;
            const done = p.taskCounts?.done || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={p._id} className="card project-card" onClick={() => navigate(`/projects/${p._id}`)}>
                <div className="project-card-header">
                  <h3 className="project-card-name">{p.name}</h3>
                  <span className="badge badge-admin" style={{ fontSize: '0.65rem' }}>{pct}%</span>
                </div>
                {p.description && <p className="project-card-desc">{p.description}</p>}
                <div className="project-card-meta">
                  <span><HiOutlineUserGroup /> {p.members?.length || 0} members</span>
                  <span><HiOutlineFolder /> {total} tasks</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }}></div></div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title="Create Project" onClose={() => setShowModal(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</button></>}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="My Awesome Project" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
