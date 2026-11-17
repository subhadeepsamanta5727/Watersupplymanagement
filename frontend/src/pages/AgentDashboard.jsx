import { useCallback, useEffect, useState } from 'react';
import {
  Banknote, CheckCircle, Clock, HandCoins, LogOut, MapPin, Package,
  PackageCheck, Phone, RefreshCw, Truck, Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const formatMoney = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

const AgentDashboard = () => {
  const { user, logout, authFetch } = useAuth();
  const [dashboard, setDashboard] = useState({
    vendor: null,
    orders: [],
    stats: {},
    settlements: []
  });
  const [activeTab, setActiveTab] = useState('deliveries');
  const [deliveryForms, setDeliveryForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const firstPage = await authFetch('/agent/dashboard?page=1&limit=100');
      if (!firstPage.success) {
        setError(firstPage.message || 'Failed to load your delivery board.');
        return;
      }

      const totalPages = Math.max(1, firstPage.pagination?.totalPages || 1);
      const otherPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          authFetch(`/agent/dashboard?page=${index + 2}&limit=100`))
      );
      if (otherPages.some((page) => !page.success)) {
        setError('Could not load every open delivery. Please refresh and try again.');
        return;
      }

      setDashboard({
        ...firstPage.data,
        orders: [firstPage, ...otherPages].flatMap((page) => page.data.orders || [])
      });
    } catch {
      setError('Network request failed while loading your delivery board.');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadDashboard();
    });
    return () => {
      active = false;
    };
  }, [loadDashboard]);

  const updateDeliveryForm = (orderId, updates) => {
    setDeliveryForms((current) => ({
      ...current,
      [orderId]: {
        ...current[orderId],
        ...updates
      }
    }));
  };

  const handleClaim = async (order) => {
    setError('');
    setSuccess('');
    setSavingOrderId(order._id);
    try {
      const result = await authFetch(`/agent/orders/${order._id}/claim`, { method: 'PUT' });
      if (!result.success) {
        setError(result.message || 'This delivery could not be claimed.');
        await loadDashboard(false);
        return;
      }
      setSuccess(`Delivery #${order._id.slice(-6)} is now yours.`);
      await loadDashboard(false);
    } catch {
      setError('Network request failed while claiming the delivery.');
    } finally {
      setSavingOrderId('');
    }
  };

  const handleRelease = async (order) => {
    setError('');
    setSuccess('');
    setSavingOrderId(order._id);
    try {
      const result = await authFetch(`/agent/orders/${order._id}/release`, { method: 'PUT' });
      if (!result.success) {
        setError(result.message || 'This delivery could not be released.');
        return;
      }
      setSuccess(`Delivery #${order._id.slice(-6)} is back in the shared board.`);
      await loadDashboard(false);
    } catch {
      setError('Network request failed while releasing the delivery.');
    } finally {
      setSavingOrderId('');
    }
  };

  const handleCompleteDelivery = async (order) => {
    const form = deliveryForms[order._id] || {};
    const products = order.products.map((product) => ({
      productId: product.productId,
      deliveredQuantity: Number(form.products?.[product.productId] ?? product.requestedQuantity ?? product.quantity)
    }));
    const cashCollected = Number(form.cashCollected || 0);

    if (!Number.isFinite(cashCollected) || cashCollected < 0) {
      setError('Cash collected must be a valid non-negative amount.');
      return;
    }

    setError('');
    setSuccess('');
    setSavingOrderId(order._id);
    try {
      const payload = {
        status: 'delivered',
        products,
        bottlesReturned: Number(form.bottlesReturned || 0),
        cashCollected
      };
      if (form.deliveryNotes && form.deliveryNotes.trim()) {
        payload.deliveryNotes = form.deliveryNotes.trim();
      }
      const result = await authFetch(`/orders/${order._id}/status`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (!result.success) {
        setError(result.message || 'Could not complete this delivery.');
        return;
      }
      setSuccess(`Delivery #${order._id.slice(-6)} completed. Stock and customer balance have been updated.`);
      setDeliveryForms((current) => {
        const next = { ...current };
        delete next[order._id];
        return next;
      });
      await loadDashboard(false);
    } catch {
      setError('Network request failed while completing the delivery.');
    } finally {
      setSavingOrderId('');
    }
  };

  const stats = dashboard.stats || {};
  const currentAgentId = (user?.id || user?._id)?.toString();
  const navigation = [
    { id: 'deliveries', label: 'Delivery board', icon: Truck },
    { id: 'collections', label: 'Cash collection', icon: Wallet }
  ];

  return (
    <div className="min-h-dvh bg-marine-950 text-slate-100 lg:flex">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-marine-800 bg-marine-sidebar">
        <div className="p-6 border-b border-marine-800">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-300"><Truck size={22} /></div>
            <div>
              <p className="font-bold tracking-tight">H2O Delivery</p>
              <p className="text-xs text-slate-500">{dashboard.vendor?.name || 'Agent workspace'}</p>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-2">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setError(''); setSuccess(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === id
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/30'
                  : 'text-slate-400 hover:bg-marine-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
              {id === 'collections' && Number(stats.pendingCash) > 0 && (
                <span className="ml-auto w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t border-marine-800">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || 'Delivery agent'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.phone}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-marine-800 bg-marine-950/90 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 md:px-7 py-4 flex items-center gap-3">
            <div className="lg:hidden rounded-lg bg-cyan-500/10 p-2 text-cyan-300"><Truck size={20} /></div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg">
                {activeTab === 'deliveries' ? 'Shared delivery board' : 'Cash collection'}
              </h1>
              <p className="text-xs text-slate-500 truncate">Welcome, {user?.name || 'Delivery agent'}</p>
              {dashboard.vendor?.name && (
                <p className="text-xs font-medium text-sky-600 truncate">Vendor: {dashboard.vendor.name}</p>
              )}
            </div>
            <button
              onClick={() => loadDashboard()}
              disabled={loading}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-marine-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-marine-800 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button onClick={logout} className="lg:hidden p-2 text-slate-400 hover:text-white" aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
          <nav className="lg:hidden flex gap-2 px-4 pb-3 overflow-x-auto whitespace-nowrap scrollbar-none">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); setError(''); setSuccess(''); }}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
                  activeTab === id ? 'bg-sky-600 text-white' : 'bg-sky-600/10 text-sky-400'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </header>

        <main className="max-w-7xl mx-auto p-4 md:p-7 space-y-6">
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div role="status" className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
              {success}
            </div>
          )}

          <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Open deliveries', value: stats.openDeliveries || 0, icon: Package, tone: 'text-cyan-300' },
              { label: 'Jars collected today', value: stats.jarsCollectedToday || 0, icon: PackageCheck, tone: 'text-sky-400' },
              { label: 'Completed today', value: stats.completedToday || 0, icon: Truck, tone: 'text-emerald-400' },
              { label: 'Collected today', value: formatMoney(stats.todayCash), icon: Banknote, tone: 'text-amber-300' }
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="glass-panel rounded-2xl border border-marine-800 p-4 md:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">{label}</p>
                  <Icon size={17} className={tone} />
                </div>
                <p className={`mt-2 text-xl md:text-2xl font-extrabold ${tone}`}>{value}</p>
              </div>
            ))}
          </section>

          {activeTab === 'deliveries' && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Open delivery work</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Everyone sees the same open orders. Claim one before starting; claimed orders show who is handling them.
                  </p>
                </div>
                <span className="rounded-full border border-marine-700 bg-sky-600/10 px-3 py-1.5 text-xs text-sky-400">
                  {dashboard.orders.length} orders on this page
                </span>
              </div>

              {loading ? (
                <div className="glass-panel rounded-2xl border border-marine-800 py-16 text-center text-slate-400">
                  Loading shared deliveries...
                </div>
              ) : dashboard.orders.length === 0 ? (
                <div className="glass-panel rounded-2xl border border-marine-800 p-10 text-center">
                  <CheckCircle size={34} className="mx-auto mb-3 text-emerald-400" />
                  <p className="font-semibold text-slate-200">All caught up</p>
                  <p className="mt-1 text-sm text-slate-500">There are no open deliveries for your vendor.</p>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {dashboard.orders.map((order) => {
                    const form = deliveryForms[order._id] || {};
                    const agent = order.deliveryAgentId;
                    const agentId = agent?._id || agent;
                    const isMine = Boolean(agentId && agentId.toString() === currentAgentId);
                    const isClaimedByOther = Boolean(agentId && !isMine);
                    const customer = order.customerId || {};
                    const jarsOutstanding = Number(customer.bottlesOutstanding || 0);
                    const products = (order.products || []).map((product) => {
                      const productId = product.productId?.toString() || product.productId;
                      const requested = Number(product.requestedQuantity ?? product.quantity);
                      const delivered = Number(form.products?.[productId] ?? requested);
                      return { ...product, productId, requested, delivered };
                    });
                    const deliveredTotal = products.reduce((sum, product) => sum + product.delivered, 0);
                    const deliveryCharge = products.reduce(
                      (sum, product) => sum + Number(product.price || 0) * product.delivered,
                      0
                    );
                    const maximumJarReturn = jarsOutstanding + deliveredTotal;

                    return (
                      <article
                        key={order._id}
                        className={`glass-panel overflow-hidden rounded-2xl border ${
                          isMine ? 'border-sky-500/40 shadow-lg shadow-sky-950/10' : 'border-marine-800'
                        }`}
                      >
                        <div className="flex items-start gap-3 border-b border-marine-800 p-4 md:p-5">
                          <div className={`rounded-xl p-2.5 ${isMine ? 'bg-sky-500/10 text-cyan-300' : 'bg-marine-800 text-slate-400'}`}>
                            <Package size={19} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-white">{customer.name || 'Customer'}</h3>
                              <span className="text-[10px] text-slate-500">#{order._id.slice(-6)}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {new Date(order.createdAt).toLocaleDateString()}
                              {order.deliverySlot ? ` · ${order.deliverySlot}` : ''}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            isMine
                              ? 'bg-sky-500/10 text-sky-400'
                              : isClaimedByOther
                                ? 'bg-amber-500/10 text-amber-300'
                                : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {isMine ? 'CLAIMED BY YOU' : isClaimedByOther ? `WITH ${agent?.name || 'ANOTHER AGENT'}` : 'OPEN'}
                          </span>
                        </div>

                        <div className="space-y-4 p-4 md:p-5">
                          {!isClaimedByOther && (
                            <div className="grid gap-2 text-sm text-slate-300">
                              {customer.phone && (
                                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-cyan-300 hover:text-sky-600">
                                  <Phone size={15} />
                                  {customer.phone}
                                </a>
                              )}
                              {order.deliveryAddress && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-start gap-2 text-cyan-400 hover:underline group"
                                  title="Open location in Google Maps"
                                >
                                  <MapPin size={15} className="mt-0.5 shrink-0 text-cyan-400 group-hover:scale-110 transition-transform" />
                                  <span className="text-slate-300 group-hover:text-cyan-300">{order.deliveryAddress}</span>
                                </a>
                              )}
                            </div>
                          )}
                          {isClaimedByOther && (
                            <p className="text-sm text-slate-400">
                              This order is being handled by <span className="font-semibold text-amber-700">{agent?.name || 'another agent'}</span>.
                            </p>
                          )}

                          <div className="rounded-xl border border-marine-800 bg-white/70 p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Items for delivery</p>
                              {!isClaimedByOther && (
                                <p className="text-[10px] text-slate-500">Empty jars outstanding: {jarsOutstanding}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              {products.map((product) => (
                                <div key={product.productId} className="flex items-center gap-3 text-sm">
                                  <span className="min-w-0 flex-1 truncate text-slate-300">{product.name}</span>
                                  {isMine ? (
                                    <>
                                      <span className="text-xs text-slate-500">{formatMoney(product.price)} each</span>
                                      <label className="flex items-center gap-1.5 text-xs text-slate-500">
                                        Qty
                                        <input
                                          type="number"
                                          min="0"
                                          max={product.requested}
                                          step="1"
                                          value={product.delivered}
                                          onChange={(event) => updateDeliveryForm(order._id, {
                                            products: {
                                              ...form.products,
                                              [product.productId]: event.target.value
                                            }
                                          })}
                                          className="w-16 rounded-lg border border-marine-700 bg-marine-900 px-2 py-1.5 text-center text-white"
                                        />
                                      </label>
                                    </>
                                  ) : (
                                    <span className="text-xs font-semibold text-slate-300">
                                      Qty {product.requested}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {isMine ? (
                            <div className="space-y-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block rounded-xl border border-marine-800 bg-white/70 p-3">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Empty jars picked up
                                  </span>
                                  <span className="mt-1 block text-[11px] text-slate-500">
                                    Up to {maximumJarReturn} available
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={maximumJarReturn}
                                    step="1"
                                    value={form.bottlesReturned ?? 0}
                                    onChange={(event) => updateDeliveryForm(order._id, {
                                      bottlesReturned: event.target.value
                                    })}
                                    className="mt-2 w-full rounded-lg border border-marine-700 bg-marine-900 px-3 py-2 text-sm text-white"
                                  />
                                </label>
                                <label className="block rounded-xl border border-marine-800 bg-white/70 p-3">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Cash collected
                                  </span>
                                  <span className="mt-1 block text-[11px] text-slate-500">
                                    Delivery charge: {formatMoney(deliveryCharge)}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={deliveryCharge}
                                    step="0.01"
                                    value={form.cashCollected ?? 0}
                                    onChange={(event) => updateDeliveryForm(order._id, {
                                      cashCollected: event.target.value
                                    })}
                                    className="mt-2 w-full rounded-lg border border-marine-700 bg-marine-900 px-3 py-2 text-sm text-white"
                                  />
                                </label>
                              </div>
                              <label className="block rounded-xl border border-marine-800 bg-white/70 p-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Delivery Remarks / Notes (Optional)
                                </span>
                                <input
                                  type="text"
                                  placeholder="e.g. Left with security, customer absent, gate code 123"
                                  value={form.deliveryNotes ?? ''}
                                  onChange={(event) => updateDeliveryForm(order._id, {
                                    deliveryNotes: event.target.value
                                  })}
                                  className="mt-2 w-full rounded-lg border border-marine-700 bg-marine-900 px-3 py-2 text-sm text-white"
                                />
                              </label>
                              <p className="text-[11px] text-slate-500">
                                Enter 0 if the customer pays later. Partial cash is recorded immediately; the vendor sees and confirms the handover.
                              </p>
                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-marine-800 pt-3">
                                <p className="text-sm font-bold text-white">
                                  Delivery value <span className="text-cyan-300">{formatMoney(deliveryCharge)}</span>
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleRelease(order)}
                                    disabled={savingOrderId === order._id}
                                    className="rounded-lg border border-marine-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-marine-800 disabled:opacity-50"
                                  >
                                    Release
                                  </button>
                                  <button
                                    onClick={() => handleCompleteDelivery(order)}
                                    disabled={savingOrderId === order._id}
                                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                                  >
                                    <CheckCircle size={15} />
                                    {savingOrderId === order._id ? 'Saving...' : 'Complete delivery'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : !isClaimedByOther ? (
                            <button
                              onClick={() => handleClaim(order)}
                              disabled={savingOrderId === order._id}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-50"
                            >
                              <HandCoins size={16} />
                              {savingOrderId === order._id ? 'Claiming...' : 'Claim this delivery'}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === 'collections' && (
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Cash collection</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Customer balances update when you record cash. Unsubmitted cash stays here until your vendor confirms receipt.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="glass-panel rounded-2xl border border-marine-800 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-300"><Banknote size={20} /></div>
                    <div>
                      <p className="text-xs text-slate-500">Collected today</p>
                      <p className="mt-1 text-2xl font-extrabold text-white">{formatMoney(stats.todayCash)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-300"><Wallet size={20} /></div>
                    <div>
                      <p className="text-xs text-slate-500">Awaiting vendor handover</p>
                      <p className="mt-1 text-2xl font-extrabold text-amber-400">{formatMoney(stats.pendingCash)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">This amount carries across days until marked submitted by your vendor.</p>
                </div>
              </div>

              <div className="glass-panel overflow-hidden rounded-2xl border border-marine-800">
                <div className="flex items-center gap-2 border-b border-marine-800 p-4">
                  <Clock size={17} className="text-cyan-300" />
                  <h3 className="font-bold">Recent handovers</h3>
                </div>
                {dashboard.settlements.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No cash handovers have been submitted yet.</p>
                ) : (
                  <div className="divide-y divide-marine-800/70">
                    {dashboard.settlements.map((settlement) => (
                      <div key={settlement._id} className="flex items-center gap-3 p-4">
                        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400"><CheckCircle size={16} /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-200">Submitted to vendor</p>
                          <p className="text-xs text-slate-500">{new Date(settlement.submittedAt).toLocaleString()}</p>
                        </div>
                        <p className="font-bold text-emerald-400">{formatMoney(settlement.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default AgentDashboard;
