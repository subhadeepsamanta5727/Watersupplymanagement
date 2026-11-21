import { useState } from 'react';
import { CheckCircle, IndianRupee, Phone, Plus, RefreshCw, Trash2, UserPlus, Users, X } from 'lucide-react';

const hasUnsettledBalances = (agent) => Number(agent.pendingCash || 0) > 0 || Number(agent.pendingJars || 0) > 0;

const VendorAgentsPanel = ({ agents, authFetch, onAgentsUpdated, canCreateAgents }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [submittingAgentId, setSubmittingAgentId] = useState('');
  const [submittingJarAgentId, setSubmittingJarAgentId] = useState('');
  const [deletingAgentId, setDeletingAgentId] = useState('');
  const [updatingAgentId, setUpdatingAgentId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const trimmedName = name.trim();
    if (!canCreateAgents) {
      setError('An active subscription is required to add delivery agents.');
      return;
    }
    if (!trimmedName || !/^\d{10}$/.test(phone)) {
      setError('Enter the agent name and a 10-digit phone number.');
      return;
    }

    setSaving(true);
    try {
      const result = await authFetch('/vendor/agents', {
        method: 'POST',
        body: JSON.stringify({ name: trimmedName, phone })
      });
      if (!result.success) {
        setError(result.message || 'Failed to create delivery agent.');
        return;
      }

      setName('');
      setPhone('');
      setSuccess('Delivery agent created. They can sign in with phone OTP.');
      setShowCreateModal(false);
      await onAgentsUpdated();
    } catch {
      setError('Connection failure while creating the delivery agent.');
    } finally {
      setSaving(false);
    }
  };

  const submitCollection = async (agent) => {
    setError('');
    setSuccess('');
    setSubmittingAgentId(agent._id);
    try {
      const result = await authFetch(`/vendor/agents/${agent._id}/settlements`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (!result.success) {
        setError(result.message || 'Failed to submit the agent collection.');
        return;
      }

      setSuccess(`₹${Number(result.data.amount).toFixed(2)} from ${agent.name} marked as submitted.`);
      await onAgentsUpdated();
    } catch {
      setError('Connection failure while submitting the agent collection.');
    } finally {
      setSubmittingAgentId('');
    }
  };

  const submitJarCollection = async (agent) => {
    setError('');
    setSuccess('');
    setSubmittingJarAgentId(agent._id);
    try {
      const result = await authFetch(`/vendor/agents/${agent._id}/jar-settlements`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (!result.success) {
        setError(result.message || 'Failed to submit the agent jars.');
        return;
      }

      setSuccess(`${Number(result.data.jarCount)} jars from ${agent.name} marked as submitted.`);
      await onAgentsUpdated();
    } catch {
      setError('Connection failure while submitting the agent jars.');
    } finally {
      setSubmittingJarAgentId('');
    }
  };

  const deleteAgent = async (agent) => {
    setError('');
    setSuccess('');
    setDeletingAgentId(agent._id);
    try {
      const result = await authFetch(`/vendor/agents/${agent._id}`, { method: 'DELETE' });
      if (!result.success) {
        setError(result.message || 'Failed to remove the delivery agent.');
        return;
      }

      setSuccess(`${agent.name} was permanently removed. Historical records were retained.`);
      await onAgentsUpdated();
    } catch {
      setError('Connection failure while removing the delivery agent.');
    } finally {
      setDeletingAgentId('');
    }
  };

  const updateAgentStatus = async (agent, isActive) => {
    setError('');
    setSuccess('');
    setUpdatingAgentId(agent._id);
    try {
      const result = await authFetch(`/vendor/agents/${agent._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive })
      });
      if (!result.success) {
        setError(result.message || 'Failed to update the delivery agent status.');
        return;
      }

      setSuccess(`${agent.name} was ${isActive ? 'activated' : 'deactivated'}.`);
      await onAgentsUpdated();
    } catch {
      setError('Connection failure while updating the delivery agent status.');
    } finally {
      setUpdatingAgentId('');
    }
  };

  const promptAgentStatusChange = (agent) => {
    const isActive = !agent.isActive;
    setConfirmAction({
      title: `${isActive ? 'Activate' : 'Deactivate'} Agent`,
      message: isActive
        ? `Allow ${agent.name} to sign in and access agent delivery features again?`
        : `Deactivate ${agent.name}'s account? They will no longer be able to sign in or use agent delivery features.`,
      confirmLabel: `${isActive ? 'Activate' : 'Deactivate'} agent`,
      danger: !isActive,
      onConfirm: () => updateAgentStatus(agent, isActive)
    });
  };

  const promptDeleteAgent = (agent) => {
    setConfirmAction({
      title: 'Permanently Remove Agent',
      message: `Permanently delete ${agent.name}'s login account? Pending cash and jars must be settled first. Pending orders will be returned to the open queue; historical records will be retained.`,
      confirmLabel: 'Permanently remove',
      danger: true,
      onConfirm: () => deleteAgent(agent)
    });
  };

  const promptSubmitCollection = (agent) => {
    setConfirmAction({
      title: 'Confirm Cash Handover',
      message: `Confirm that you have physically received ₹${Number(agent.pendingCash).toFixed(2)} cash from ${agent.name}?`,
      confirmLabel: 'Confirm Received',
      onConfirm: () => submitCollection(agent)
    });
  };

  const promptSubmitJarCollection = (agent) => {
    const jarCount = Number(agent.pendingJars || 0);
    setConfirmAction({
      title: 'Confirm Empty Jar Handover',
      message: `Confirm that you have physically received ${jarCount} empty jars from ${agent.name}?`,
      confirmLabel: 'Confirm Received',
      onConfirm: () => submitJarCollection(agent)
    });
  };

  const refreshAgents = async () => {
    setRefreshing(true);
    setError('');
    try {
      await onAgentsUpdated();
    } catch {
      setError('Could not refresh delivery-agent collection totals.');
    } finally {
      setRefreshing(false);
    }
  };

  const closeCreateModal = () => {
    if (saving) return;
    setShowCreateModal(false);
    setName('');
    setPhone('');
    setError('');
  };

  return (
    <section className="space-y-6 animate-tab-transition">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Delivery Agents</h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Create agents for your vendor account. All agents share the open delivery board and can claim work.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setError(''); setSuccess(''); setShowCreateModal(true); }}
          disabled={!canCreateAgents}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          Add agent
        </button>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          {success}
        </div>
      )}
      {!canCreateAgents && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
          Agent creation and new order assignments require an active subscription. You can still review and submit collected cash and jars.
        </div>
      )}

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-agent-title"
            className="glass-panel-glow w-full max-w-lg rounded-2xl border border-sky-500/30 p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 id="create-agent-title" className="flex items-center gap-2 text-lg font-bold text-white">
                <UserPlus size={18} className="text-cyan-400" />
                Add a delivery agent
              </h2>
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={saving}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-400 hover:bg-marine-800 hover:text-white disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            {error && (
              <div role="alert" className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-400">
                  Agent name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={100}
                    required
                    autoFocus
                    className="mt-2 w-full rounded-lg border border-marine-800 bg-marine-950/50 px-3 py-2.5 text-sm text-white"
                    placeholder="Name"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-400">
                  Phone number
                  <div className="mt-2 flex items-center rounded-lg border border-marine-800 bg-marine-950/50 px-3">
                    <Phone size={15} className="mr-2 text-slate-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      required
                      className="w-full bg-transparent py-2.5 text-sm text-white outline-none"
                      placeholder="10-digit phone"
                    />
                  </div>
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Agents sign in through the phone OTP login using this number.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={saving}
                  className="rounded-lg border border-marine-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-marine-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-2xl border border-marine-800 overflow-hidden">
        <div className="p-5 border-b border-marine-800 flex items-center gap-2">
          <Users size={18} className="text-cyan-400" />
          <h2 className="font-bold text-white">Your agents</h2>
          <span className="ml-auto text-xs text-slate-400">{agents.length}</span>
          <button
            type="button"
            onClick={refreshAgents}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-marine-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-marine-800 disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        {agents.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No delivery agents have been added.</p>
        ) : (
          <ul className="divide-y divide-marine-800/60">
            {agents.map((agent) => (
              <li key={agent._id} className="p-4 md:p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{agent.name}</p>
                    <p className="text-xs text-slate-400">{agent.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => promptAgentStatusChange(agent)}
                    disabled={updatingAgentId === agent._id}
                    aria-label={`${agent.isActive ? 'Deactivate' : 'Activate'} ${agent.name}`}
                    className={`ml-auto px-2 py-1 rounded text-[10px] font-bold cursor-pointer disabled:cursor-wait disabled:opacity-50 ${
                      agent.isActive
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-slate-500/10 border border-slate-500/30 text-slate-400 hover:bg-slate-500/20'
                    }`}
                  >
                    {updatingAgentId === agent._id ? 'UPDATING...' : agent.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  <div className="rounded-xl bg-marine-950/60 border border-marine-800 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Jars collected today</p>
                    <p className="mt-1 font-bold text-white">{Number(agent.jarsCollectedToday || 0)}</p>
                  </div>
                  <div className="rounded-xl bg-marine-950/60 border border-marine-800 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Cash collected today</p>
                    <p className="mt-1 font-bold text-white">₹{Number(agent.todayCash || 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl bg-marine-950/60 border border-amber-500/20 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Awaiting handover</p>
                    <p className="mt-1 font-bold text-amber-300">₹{Number(agent.pendingCash || 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl bg-marine-950/60 border border-amber-500/20 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Jars awaiting handover</p>
                    <p className="mt-1 font-bold text-amber-300">{Number(agent.pendingJars || 0)}</p>
                  </div>
                  <div className="rounded-xl bg-marine-950/60 border border-marine-800 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Last cash submitted</p>
                    <p className="mt-1 text-xs font-semibold text-slate-300">
                      {agent.lastSubmittedAt
                        ? `${new Date(agent.lastSubmittedAt).toLocaleString()} · ₹${Number(agent.lastSubmittedAmount || 0).toFixed(2)}`
                        : 'No cash submissions yet'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => promptSubmitCollection(agent)}
                    disabled={submittingAgentId === agent._id || Number(agent.pendingCash || 0) <= 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {submittingAgentId === agent._id ? <IndianRupee size={15} /> : <CheckCircle size={15} />}
                    {submittingAgentId === agent._id ? 'Submitting...' : 'Mark cash as submitted'}
                  </button>
                  <button
                    type="button"
                    onClick={() => promptSubmitJarCollection(agent)}
                    disabled={submittingJarAgentId === agent._id || Number(agent.pendingJars || 0) <= 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {submittingJarAgentId === agent._id
                      ? <RefreshCw size={15} className="animate-spin" />
                      : <CheckCircle size={15} />}
                    {submittingJarAgentId === agent._id ? 'Submitting...' : 'Mark jars as submitted'}
                  </button>
                  <button
                    type="button"
                    onClick={() => promptDeleteAgent(agent)}
                    disabled={hasUnsettledBalances(agent) || deletingAgentId === agent._id}
                    title={hasUnsettledBalances(agent) ? 'Settle all cash and jars before removing this agent.' : undefined}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    {deletingAgentId === agent._id ? 'Removing...' : 'Remove agent'}
                  </button>
                </div>
                {hasUnsettledBalances(agent) && (
                  <p className="text-xs text-amber-300">
                    Settle all outstanding cash and jars before removing this agent.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-marine-800 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">{confirmAction.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{confirmAction.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = confirmAction.onConfirm;
                  setConfirmAction(null);
                  if (action) await action();
                }}
                className={`rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer ${
                  confirmAction.danger
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-sky-600 hover:bg-sky-500'
                }`}
              >
                {confirmAction.confirmLabel || 'Confirm Received'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default VendorAgentsPanel;
