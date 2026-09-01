import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, X, Trash2, Pencil, LogOut, Users, UserPlus } from 'lucide-react';
import { api } from './api.js';
import { useAuth, AuthProvider } from './context/AuthContext.jsx';
import Login from './components/Login.jsx';

const STATUSES = ['Lead', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Active', 'Closed', 'Lost'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const STATUS_STYLE = {
  Lead: { bg: '#EDE4D3', text: '#6B5233' }, Contacted: { bg: '#E4D9C4', text: '#5C4326' },
  Qualified: { bg: '#E0DCC6', text: '#565033' }, Proposal: { bg: '#E8DCC0', text: '#7A5A1E' },
  Negotiation: { bg: '#F3DCC9', text: '#9C4A1E' }, Active: { bg: '#DEE6D2', text: '#3F5B2C' },
  Closed: { bg: '#D6E4D0', text: '#2F4A22' }, Lost: { bg: '#E9E4DC', text: '#8A8478' },
};

const emptyForm = () => ({ clientName: '', company: '', email: '', phone: '', address: '', status: 'Lead', priority: 'Medium', followUpDate: '', targetCloseDate: '', description: '' });

function followUpBucket(dateStr, status) {
  if (!dateStr || status === 'Closed' || status === 'Lost') return null;
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr < today) return { label: 'Overdue', color: '#9C4A1E', dot: '#C1440E' };
  if (dateStr === today) return { label: 'Due today', color: '#8A6A1E', dot: '#D9A916' };
  return { label: 'Upcoming', color: '#3F5B2C', dot: '#6B8355' };
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Inter:wght@400;500;600&display=swap');
      .ct-serif { font-family: 'Fraunces', serif; }
      .ct-btn { cursor: pointer; border: none; font-family: inherit; transition: opacity 0.15s; }
      .ct-btn:hover { opacity: 0.85; }
      .ct-input { font-family: inherit; padding: 9px 12px; border-radius: 8px; border: 1px solid #D9CFBC; background: #fff; font-size: 14px; width: 100%; box-sizing: border-box; }
      .ct-input:focus { outline: none; border-color: #A67C52; }
      .ct-skel { background: linear-gradient(90deg, #EDE4D3 25%, #F3EBDD 37%, #EDE4D3 63%); background-size: 400% 100%; animation: ct-shimmer 1.4s ease infinite; border-radius: 8px; }
      @keyframes ct-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
    `}</style>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: isError ? '#4A2320' : '#3A2A1D', color: '#F3EBDD', padding: '10px 18px', borderRadius: 8, fontSize: 14, zIndex: 50, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span>{toast.message}</span>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#F3EBDD', cursor: 'pointer', opacity: 0.7 }}><X size={14} /></button>
    </div>
  );
}

function Header({ children }) {
  const { user, logout } = useAuth();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
      <div>
        <h1 className="ct-serif" style={{ fontSize: 26, color: '#3A2A1D', margin: 0, fontWeight: 600 }}>Mahogany client tracker</h1>
        <p style={{ color: '#8A8478', fontSize: 13, marginTop: 4 }}>
          {user.name} · <span style={{ textTransform: 'capitalize' }}>{user.role}</span>
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {children}
        <button className="ct-btn" onClick={logout} style={{ background: '#fff', color: '#6B5233', padding: '10px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, border: '1px solid #E7DFCE', display: 'flex', alignItems: 'center', gap: 6 }}>
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E7DFCE', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: '#8A8478', marginBottom: 6 }}>{label}</div>
      <div className="ct-serif" style={{ fontSize: 22, color: accent ? '#9C4A1E' : '#3A2A1D', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function Field({ label, children, style }) {
  return <div style={style}><label style={{ fontSize: 12, color: '#6B5F4F', marginBottom: 4, display: 'block' }}>{label}</label>{children}</div>;
}

function ClientForm({ initial, editingId, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.clientName.trim()) { setError('Client name is required.'); return; }
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || 'Could not save this client.');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(58,42,29,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 10 }}>
      <div style={{ background: '#FBF8F2', borderRadius: 14, padding: 24, width: '100%', maxWidth: 460, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="ct-serif" style={{ margin: 0, fontSize: 19, color: '#3A2A1D' }}>{editingId ? 'Edit client' : 'New client'}</h2>
          <button className="ct-btn" onClick={onClose} style={{ background: 'transparent', color: '#8A8478' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Client name"><input className="ct-input" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></Field>
          {error && <div style={{ color: '#9C4A1E', fontSize: 12 }}>{error}</div>}
          <Field label="Company"><input className="ct-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Email" style={{ flex: 1 }}><input className="ct-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone" style={{ flex: 1 }}><input className="ct-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <Field label="Address"><input className="ct-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Status" style={{ flex: 1 }}>
              <select className="ct-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Priority" style={{ flex: 1 }}>
              <select className="ct-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Follow-up date" style={{ flex: 1 }}><input className="ct-input" type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} /></Field>
            <Field label="Target close date" style={{ flex: 1 }}><input className="ct-input" type="date" value={form.targetCloseDate} onChange={(e) => setForm({ ...form, targetCloseDate: e.target.value })} /></Field>
          </div>
          <Field label="Description"><input className="ct-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <button className="ct-btn" onClick={submit} style={{ background: '#4A2C2A', color: '#F3EBDD', padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, marginTop: 6 }}>
            {editingId ? 'Save changes' : 'Add client'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientList({ clients, showAssignee, onEdit, onDelete }) {
  if (clients.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: '#B0A78F', background: '#fff', borderRadius: 12, border: '1px dashed #E7DFCE' }}>
        <p style={{ margin: 0, fontSize: 14 }}>No clients match right now.</p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {clients.map((c) => {
        const st = STATUS_STYLE[c.status] || STATUS_STYLE.Lead;
        const fu = followUpBucket(c.followUpDate, c.status);
        return (
          <div key={c.clientId} style={{ background: '#fff', border: '1px solid #E7DFCE', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: '#3A2A1D' }}>{c.clientName}</span>
                {c.company && <span style={{ fontSize: 13, color: '#8A8478' }}>{c.company}</span>}
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.text }}>{c.status}</span>
                {showAssignee && c.assignedToName && <span style={{ fontSize: 11, color: '#A67C52', fontWeight: 500 }}>{c.assignedToName}</span>}
              </div>
              <div style={{ fontSize: 13, color: '#8A8478', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {c.email && <span>{c.email}</span>}
                {c.phone && <span>{c.phone}</span>}
                {c.address && <span>{c.address}</span>}
                {c.targetCloseDate && <span>Target close: {c.targetCloseDate}</span>}
                {fu && <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: fu.color, fontWeight: 500 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: fu.dot, display: 'inline-block' }} />{fu.label} · {c.followUpDate}
                </span>}
              </div>
              {c.description && <div style={{ fontSize: 13, color: '#6B5F4F', marginTop: 6 }}>{c.description}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="ct-btn" onClick={() => onEdit(c)} aria-label="Edit client" style={{ background: 'transparent', color: '#8A8478', padding: 6, borderRadius: 6 }}><Pencil size={16} /></button>
              <button className="ct-btn" onClick={() => onDelete(c.clientId)} aria-label="Delete client" style={{ background: 'transparent', color: '#B0A78F', padding: 6, borderRadius: 6 }}><Trash2 size={16} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmployeeDashboard() {
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formInitial, setFormInitial] = useState(emptyForm());
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    const [c, d] = await Promise.all([api.getClients(), api.getDashboard()]);
    setClients(c.clients);
    setStats(d.stats);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => clients.filter((c) => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    const q = search.toLowerCase();
    if (q && !(c.clientName.toLowerCase().includes(q) || c.company.toLowerCase().includes(q))) return false;
    return true;
  }), [clients, search, statusFilter]);

  const openAdd = () => { setFormInitial(emptyForm()); setEditingId(null); setShowForm(true); };
  const openEdit = (c) => {
    setFormInitial({
      clientName: c.clientName, company: c.company, email: c.email, phone: c.phone, address: c.address,
      status: c.status, priority: c.priority, followUpDate: c.followUpDate, targetCloseDate: c.targetCloseDate, description: c.description,
    });
    setEditingId(c.clientId); setShowForm(true);
  };
  const save = async (form) => {
    if (editingId) {
      const { client } = await api.updateClient(editingId, form);
      setClients((prev) => prev.map((c) => (c.clientId === editingId ? client : c)));
      showToast('Client updated');
    } else {
      const { client } = await api.addClient(form);
      setClients((prev) => [client, ...prev]);
      showToast('Client added');
    }
    setShowForm(false);
    const d = await api.getDashboard();
    setStats(d.stats);
  };
  const remove = async (clientId) => {
    if (!window.confirm('Delete this client?')) return;
    await api.deleteClient(clientId, false);
    setClients((prev) => prev.filter((c) => c.clientId !== clientId));
    const d = await api.getDashboard();
    setStats(d.stats);
    showToast('Client deleted');
  };

  return (
    <>
      <Header>
        <button className="ct-btn" onClick={openAdd} style={{ background: '#4A2C2A', color: '#F3EBDD', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Add client
        </button>
      </Header>

      {loading || !stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="ct-skel" style={{ height: 76 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
          <StatCard label="Your target" value={stats.target} />
          <StatCard label="Closed" value={stats.closed} />
          <StatCard label="Progress" value={`${stats.percentToTarget}%`} />
          <StatCard label="Follow-ups due" value={stats.followUpsDue} accent={stats.followUpsDue > 0} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: '#B0A78F' }} />
          <input className="ct-input" style={{ paddingLeft: 34 }} placeholder="Search your clients" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="ct-input" style={{ width: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1, 2, 3].map((i) => <div key={i} className="ct-skel" style={{ height: 64 }} />)}</div>
      ) : (
        <ClientList clients={filtered} showAssignee={false} onEdit={openEdit} onDelete={remove} />
      )}

      {showForm && <ClientForm initial={formInitial} editingId={editingId} onSave={save} onClose={() => setShowForm(false)} />}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

function AdminDashboard() {
  const [team, setTeam] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [empForm, setEmpForm] = useState({ name: '', email: '', password: '', monthlyTarget: 10 });
  const [empError, setEmpError] = useState('');
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    const [d, c] = await Promise.all([api.getTeam(), api.getClients()]);
    setTeam(d.team);
    setClients(c.clients);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => team.reduce((acc, m) => ({
    target: acc.target + m.target, closed: acc.closed + m.closed, followUpsDue: acc.followUpsDue + m.followUpsDue,
  }), { target: 0, closed: 0, followUpsDue: 0 }), [team]);

  const removeEmployee = async (id, name) => {
    if (!window.confirm(`Remove ${name}'s login? Their clients stay in the system, just unassigned.`)) return;
    try {
      await api.deleteUser(id);
      showToast(`${name} removed`);
      load();
    } catch (err) {
      showToast(err.message || 'Could not remove this employee.', 'error');
    }
  };

  const addEmployee = async () => {
    if (!empForm.name.trim() || !empForm.email.trim() || !empForm.password) { setEmpError('Name, email, and password are required.'); return; }
    try {
      await api.createUser({ ...empForm, monthlyTarget: Number(empForm.monthlyTarget) || 0 });
      setShowAddEmployee(false);
      setEmpForm({ name: '', email: '', password: '', monthlyTarget: 10 });
      setEmpError('');
      showToast('Employee added');
      load();
    } catch (err) {
      setEmpError(err.message || 'Could not add employee.');
    }
  };

  return (
    <>
      <Header>
        <button className="ct-btn" onClick={() => setShowAddEmployee(true)} style={{ background: '#4A2C2A', color: '#F3EBDD', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserPlus size={16} /> Add employee
        </button>
      </Header>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
          {[1, 2, 3].map((i) => <div key={i} className="ct-skel" style={{ height: 76 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
          <StatCard label="Team target" value={totals.target} />
          <StatCard label="Team closed" value={totals.closed} />
          <StatCard label="Follow-ups due" value={totals.followUpsDue} accent={totals.followUpsDue > 0} />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Users size={16} style={{ color: '#8A8478' }} />
        <h2 className="ct-serif" style={{ fontSize: 16, color: '#3A2A1D', margin: 0, fontWeight: 600 }}>Team progress</h2>
      </div>

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {team.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 24px', color: '#B0A78F', background: '#fff', borderRadius: 12, border: '1px dashed #E7DFCE' }}>
              <p style={{ margin: 0, fontSize: 14 }}>No employees yet. Add your first one.</p>
            </div>
          )}
          {team.map((m) => (
            <div key={m.id} style={{ background: '#fff', border: '1px solid #E7DFCE', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: '#3A2A1D' }}>{m.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#8A8478' }}>{m.closed} / {m.target} closed{m.followUpsDue > 0 ? ` · ${m.followUpsDue} follow-ups due` : ''}</span>
                  <button className="ct-btn" onClick={() => removeEmployee(m.id, m.name)} aria-label="Remove employee" style={{ background: 'transparent', color: '#B0A78F', padding: 4, borderRadius: 6 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div style={{ height: 6, background: '#EDE4D3', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${m.percentToTarget}%`, background: '#6B8355', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="ct-serif" style={{ fontSize: 16, color: '#3A2A1D', margin: '0 0 12px', fontWeight: 600 }}>All clients</h2>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1, 2].map((i) => <div key={i} className="ct-skel" style={{ height: 64 }} />)}</div>
      ) : (
        <ClientList clients={clients} showAssignee onEdit={() => {}} onDelete={() => {}} />
      )}

      {showAddEmployee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(58,42,29,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 10 }}>
          <div style={{ background: '#FBF8F2', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="ct-serif" style={{ margin: 0, fontSize: 19, color: '#3A2A1D' }}>Add employee</h2>
              <button className="ct-btn" onClick={() => setShowAddEmployee(false)} style={{ background: 'transparent', color: '#8A8478' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Name"><input className="ct-input" value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} /></Field>
              <Field label="Email"><input className="ct-input" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} /></Field>
              <Field label="Temporary password"><input className="ct-input" type="text" value={empForm.password} onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })} /></Field>
              <Field label="Monthly target (number of clients)"><input className="ct-input" type="number" min="0" value={empForm.monthlyTarget} onChange={(e) => setEmpForm({ ...empForm, monthlyTarget: e.target.value })} /></Field>
              {empError && <div style={{ color: '#9C4A1E', fontSize: 12 }}>{empError}</div>}
              <button className="ct-btn" onClick={addEmployee} style={{ background: '#4A2C2A', color: '#F3EBDD', padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>Create login</button>
            </div>
          </div>
        </div>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

function Shell() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: '100vh', background: '#FBF8F2' }}>
      <GlobalStyle />
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 64px' }}>
        {user.role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}