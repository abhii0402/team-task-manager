import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineUserAdd, HiOutlineArrowLeft, HiOutlineSearch, HiOutlineCalendar } from 'react-icons/hi';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignee: '', priority: 'medium', dueDate: '', status: 'todo' });
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = project?.userRole === 'admin';

  const fetchData = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        API.get(`/projects/${id}`),
        API.get(`/tasks/project/${id}`)
      ]);
      setProject(pRes.data);
      setTasks(tRes.data);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/projects');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const openNewTask = () => {
    setEditingTask(null);
    setTaskForm({ title: '', description: '', assignee: '', priority: 'medium', dueDate: '', status: 'todo' });
    setShowTaskModal(true);
  };

  const openEditTask = (t) => {
    setEditingTask(t);
    setTaskForm({
      title: t.title, description: t.description || '',
      assignee: t.assignee?._id || '', priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.split('T')[0] : '', status: t.status
    });
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setSubmitting(true);
    try {
      if (editingTask) {
        await API.put(`/tasks/${editingTask._id}`, taskForm);
        addToast('Task updated!');
      } else {
        await API.post(`/tasks/project/${id}`, taskForm);
        addToast('Task created!');
      }
      setShowTaskModal(false);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed.', 'error');
    } finally { setSubmitting(false); }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await API.delete(`/tasks/${taskId}`);
      addToast('Task deleted.');
      fetchData();
    } catch (err) { addToast(err.response?.data?.message || 'Failed.', 'error'); }
  };

  const quickStatusUpdate = async (taskId, status) => {
    try {
      await API.put(`/tasks/${taskId}`, { status });
      fetchData();
    } catch (err) { addToast('Failed to update status.', 'error'); }
  };

  const searchUsers = async (q) => {
    setMemberEmail(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await API.get(`/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const addMember = async (email) => {
    try {
      await API.post(`/projects/${id}/members`, { email, role: memberRole });
      addToast('Member added!');
      setMemberEmail('');
      setSearchResults([]);
      fetchData();
    } catch (err) { addToast(err.response?.data?.message || 'Failed.', 'error'); }
  };

  const removeMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await API.delete(`/projects/${id}/members/${userId}`);
      addToast('Member removed.');
      fetchData();
    } catch (err) { addToast(err.response?.data?.message || 'Failed.', 'error'); }
  };

  const deleteProject = async () => {
    if (!confirm('Delete this project and all its tasks? This cannot be undone.')) return;
    try {
      await API.delete(`/projects/${id}`);
      addToast('Project deleted.');
      navigate('/projects');
    } catch (err) { addToast(err.response?.data?.message || 'Failed.', 'error'); }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;
  if (!project) return null;

  const columns = [
    { key: 'todo', label: 'To Do', color: 'var(--info)' },
    { key: 'in-progress', label: 'In Progress', color: 'var(--warning)' },
    { key: 'done', label: 'Done', color: 'var(--success)' },
  ];

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const isOverdue = (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done';
  const initials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const members = project.members || [];
  const allMembers = [
    ...(project.owner ? [{ user: project.owner, role: 'admin' }] : []),
    ...members.filter(m => m.user?._id !== project.owner?._id)
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn-icon" onClick={() => navigate('/projects')}><HiOutlineArrowLeft /></button>
          <div>
            <h1 className="page-title">{project.name}</h1>
            {project.description && <p className="page-subtitle">{project.description}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => setShowMemberModal(true)}><HiOutlineUserAdd /> Members</button>}
          <button className="btn btn-primary btn-sm" onClick={openNewTask}><HiOutlinePlus /> Add Task</button>
          {isAdmin && <button className="btn btn-danger btn-sm" onClick={deleteProject}><HiOutlineTrash /></button>}
        </div>
      </div>

      <div className="kanban-board">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key);
          return (
            <div key={col.key} className="kanban-column">
              <div className="kanban-column-header">
                <span className="kanban-column-title" style={{ color: col.color }}>{col.label}</span>
                <span className="kanban-count">{colTasks.length}</span>
              </div>
              <div className="kanban-tasks stagger-in">
                {colTasks.map(t => (
                  <div key={t._id} className={`task-card ${isOverdue(t) ? 'pulse-overdue' : ''}`} onClick={() => openEditTask(t)}>
                    <div className="task-card-title">{t.title}</div>
                    <div className="task-card-meta">
                      <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                      {isOverdue(t) && <span className="badge badge-overdue">⚠ Overdue</span>}
                    </div>
                    {t.assignee && (
                      <div className="task-card-assignee">
                        <div className="mini-avatar">{initials(t.assignee.name)}</div>
                        {t.assignee.name}
                      </div>
                    )}
                    {t.dueDate && (
                      <div className={`task-card-due ${isOverdue(t) ? 'overdue' : ''}`}>
                        <HiOutlineCalendar /> {fmt(t.dueDate)}
                      </div>
                    )}
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div className="empty-state" style={{ padding: '40px 20px', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No tasks here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showTaskModal && (
        <Modal title={editingTask ? 'Edit Task' : 'New Task'} onClose={() => setShowTaskModal(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
            {editingTask && isAdmin && <button className="btn btn-danger" onClick={() => { deleteTask(editingTask._id); setShowTaskModal(false); }}>Delete</button>}
            <button className="btn btn-primary" onClick={handleTaskSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
          </>}>
          <form onSubmit={handleTaskSubmit}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select className="form-select" value={taskForm.assignee} onChange={e => setTaskForm({ ...taskForm, assignee: e.target.value })}>
                  <option value="">Unassigned</option>
                  {allMembers.map(m => (
                    <option key={m.user?._id} value={m.user?._id}>{m.user?.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {showMemberModal && (
        <Modal title="Manage Members" onClose={() => { setShowMemberModal(false); setSearchResults([]); setMemberEmail(''); }}>
          <div className="form-group">
            <label className="form-label">Add Member by Email</label>
            <div className="search-box">
              <HiOutlineSearch />
              <input className="form-input" value={memberEmail} onChange={e => searchUsers(e.target.value)} placeholder="Search by email or name..." />
              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map(u => (
                    <div key={u._id} className="search-result-item" onClick={() => addMember(u.email)}>
                      <div className="name">{u.name}</div>
                      <div className="email">{u.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Role for new members</label>
            <select className="form-select" value={memberRole} onChange={e => setMemberRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="members-section">
            <label className="form-label">Current Members ({allMembers.length})</label>
            {allMembers.map(m => (
              <div key={m.user?._id} className="member-item">
                <div className="member-info">
                  <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>{initials(m.user?.name)}</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{m.user?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.user?.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge badge-${m.role}`}>{m.role}</span>
                  {isAdmin && m.user?._id !== project.owner?._id && (
                    <button className="btn-icon" style={{ padding: 4 }} onClick={() => removeMember(m.user?._id)}><HiOutlineTrash /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
