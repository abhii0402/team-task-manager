import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { HiOutlineClipboardList, HiOutlineClock, HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineLightningBolt, HiOutlineFolder } from 'react-icons/hi';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/tasks/dashboard/stats').then(res => setData(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  const stats = data?.stats || {};
  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your tasks and projects</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple"><HiOutlineClipboardList /></div>
          <div><div className="stat-value">{stats.total || 0}</div><div className="stat-label">Total Tasks</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><HiOutlineLightningBolt /></div>
          <div><div className="stat-value">{stats.inProgress || 0}</div><div className="stat-label">In Progress</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><HiOutlineCheckCircle /></div>
          <div><div className="stat-value">{stats.done || 0}</div><div className="stat-label">Completed</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><HiOutlineExclamation /></div>
          <div><div className="stat-value">{stats.overdue || 0}</div><div className="stat-label">Overdue</div></div>
        </div>
      </div>

      {data?.overdueTasks?.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 className="section-title" style={{ color: 'var(--danger)' }}>⚠ Overdue Tasks</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>Task</th><th>Project</th><th>Due Date</th><th>Assignee</th></tr></thead>
              <tbody>
                {data.overdueTasks.map(t => (
                  <tr key={t._id}>
                    <td style={{ fontWeight: 600 }}>{t.title}</td>
                    <td>{t.project?.name || '—'}</td>
                    <td><span className="badge badge-overdue">{fmt(t.dueDate)}</span></td>
                    <td>{t.assignee?.name || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <h2 className="section-title">Recent Tasks</h2>
          {data?.recentTasks?.length > 0 ? (
            <div className="table-container stagger-in">
              <table>
                <thead><tr><th>Task</th><th>Status</th><th>Priority</th></tr></thead>
                <tbody>
                  {data.recentTasks.slice(0, 8).map(t => (
                    <tr key={t._id}>
                      <td style={{ fontWeight: 500 }}>{t.title}</td>
                      <td><span className={`badge badge-${t.status}`}>{t.status.replace('-', ' ')}</span></td>
                      <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card empty-state" style={{ borderStyle: 'dashed' }}>
              <HiOutlineClipboardList />
              <p>No recent tasks. Everything is up to date!</p>
            </div>
          )}
        </div>

        <div>
          <h2 className="section-title">Your Projects</h2>
          {data?.projects?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="stagger-in">
              {data.projects.map(p => (
                <div key={p._id} className="card" style={{ cursor: 'pointer', padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}
                  onClick={() => navigate(`/projects/${p._id}`)}>
                  <div className="stat-icon purple" style={{ width: 36, height: 36, fontSize: '0.9rem' }}><HiOutlineFolder /></div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="card empty-state" style={{ borderStyle: 'dashed' }}>
              <HiOutlineFolder />
              <p>No projects yet. Start by creating one!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
