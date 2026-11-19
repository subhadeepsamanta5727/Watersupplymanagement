import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { loadRazorpayScript } from '../utils/loadRazorpayScript';
import VendorAgentsPanel from '../components/VendorAgentsPanel';
import ThemeToggle from '../components/ThemeToggle';
import {
  Building, Package, Users, Truck, DollarSign, LogOut, Plus, FileText,
  AlertTriangle, RefreshCw, CheckCircle, Info, Calendar, Download, Menu, X, Settings,
  IndianRupee, Edit, Activity, MapPin, Eye, Clock, ArrowLeft, History,
  Boxes, ShoppingBag, Layers, TrendingUp, TrendingDown, Tag, Percent,
  ChevronRight, Lock, UserCheck, Sparkles
} from 'lucide-react';

const getStockStatus = (stock) => {
  const quantity = Number(stock || 0);
  if (quantity <= 0) return { label: 'Out of Stock', className: 'bg-rose-500/10 text-rose-400' };
  if (quantity < 5) return { label: 'Low Stock', className: 'bg-amber-500/10 text-amber-300' };
  return { label: 'In Stock', className: 'bg-emerald-500/10 text-emerald-400' };
};

const VendorDashboard = () => {
  const { logout, user, authFetch, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // overview, subscription, products, inventory, purchases, customers, agents, deliveries, payments, settings
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data states
  const [subStatus, setSubStatus] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('today'); // today, yesterday, month
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);

  // Form modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form states - Product
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodPurchasePrice, setProdPurchasePrice] = useState('');
  const [prodIsReturnable, setProdIsReturnable] = useState(true);
  const [prodSecurityDeposit, setProdSecurityDeposit] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodQty, setProdQty] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isStockUpdateOnly, setIsStockUpdateOnly] = useState(false);

  // Form states - Customer Custom Pricing
  const [showCustomPriceModal, setShowCustomPriceModal] = useState(false);
  const [selectedCustomerForPricing, setSelectedCustomerForPricing] = useState(null);
  const [customerCustomPrices, setCustomerCustomPrices] = useState({});

  // Form states - Damaged Jar & Security Deposit Refund
  const [showDamageJarModal, setShowDamageJarModal] = useState(false);
  const [showRefundDepositModal, setShowRefundDepositModal] = useState(false);
  const [selectedCustForDamage, setSelectedCustForDamage] = useState(null);
  const [damageJarCount, setDamageJarCount] = useState(1);
  const [damagePenaltyAmount, setDamagePenaltyAmount] = useState('');
  const [damageDeductDeposit, setDamageDeductDeposit] = useState(false);
  const [damageNotes, setDamageNotes] = useState('');
  const [refundDepositAmount, setRefundDepositAmount] = useState('');
  const [refundAdjustBalance, setRefundAdjustBalance] = useState(false);
  const [refundNotes, setRefundNotes] = useState('');

  // Analytics states - Profit & Loss
  const [profitLossData, setProfitLossData] = useState(null);
  const [profitLossTimeframe, setProfitLossTimeframe] = useState('all');
  const [profitLossLoading, setProfitLossLoading] = useState(false);

  // Form states - Purchase / Stock Inward
  const [purchaseProdId, setPurchaseProdId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseUnitCost, setPurchaseUnitCost] = useState('');
  const [purchaseTotalAmount, setPurchaseTotalAmount] = useState('');
  const [purchaseInvoice, setPurchaseInvoice] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');

  // Form states - Customer
  const [custPhone, setCustPhone] = useState('');
  const [custName, setCustName] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [showNewCustFields, setShowNewCustFields] = useState(false);

  // Form states - Order (Delivery)
  const [selectedCustId, setSelectedCustId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [orderQty, setOrderQty] = useState(1);
  const [bottlesDelivered, setBottlesDelivered] = useState(1);
  const [bottlesReturned, setBottlesReturned] = useState(0);

  // Form states - Payment
  const [payCustId, setPayCustId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [payCashOnly, setPayCashOnly] = useState(false);

  // Settings Form States
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [vendorKeyId, setVendorKeyId] = useState('');
  const [vendorKeySecret, setVendorKeySecret] = useState('');
  const [profileSlots, setProfileSlots] = useState([]);
  const [newSlotText, setNewSlotText] = useState('');

  // Form states - View Records
  const [selectedCustForRecords, setSelectedCustForRecords] = useState(null);
  const [recordsSubTab, setRecordsSubTab] = useState('orders');
  const [recordsOrderPage, setRecordsOrderPage] = useState(1);
  const [recordsPaymentPage, setRecordsPaymentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);

  // Form states - Process Request
  const [showProcessReqModal, setShowProcessReqModal] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(null);
  const [reqBottlesDelivered, setReqBottlesDelivered] = useState('');
  const [reqBottlesReturned, setReqBottlesReturned] = useState('');
  const [reqTotalQty, setReqTotalQty] = useState(0);
  const [reqPaymentMethod, setReqPaymentMethod] = useState('due'); // due or cash
  const [reqPaymentAmount, setReqPaymentAmount] = useState('');
  const [reqError, setReqError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAllPages = async (endpoint) => {
    const limit = 100;
    const firstPage = await authFetch(`${endpoint}?page=1&limit=${limit}`);
    if (!firstPage.success) return firstPage;

    const totalPages = Math.max(1, firstPage.pagination?.totalPages || 1);
    if (totalPages === 1) return firstPage;

    const remainingPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        authFetch(`${endpoint}?page=${index + 2}&limit=${limit}`))
    );
    if (remainingPages.some((result) => !result.success)) {
      throw new Error(`Failed to load all pages for ${endpoint}`);
    }

    return {
      ...firstPage,
      count: firstPage.pagination.total,
      data: [firstPage, ...remainingPages].flatMap((page) => page.data)
    };
  };

  // Fetch all vendor data
  const fetchData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        authFetch('/vendor/subscription'),
        authFetch('/vendor/products'),
        fetchAllPages('/vendor/customers'),
        fetchAllPages('/orders'),
        fetchAllPages('/orders/payments'),
        authFetch('/vendor/plans'),
        authFetch('/vendor/agents'),
        authFetch('/purchases')
      ]);
      const [subRes, prodRes, custRes, orderRes, payRes, plansRes, agentsRes, purchasesRes] = results.map((result) => {
        if (result.status === 'rejected') {
          console.error('Failed to load dashboard data:', result.reason);
          return null;
        }
        return result.value;
      });

      if (subRes?.success) {
        setSubStatus(subRes.status);
      }

      if (prodRes?.success) setProducts(prodRes.data);
      if (purchasesRes?.success) setPurchases(purchasesRes.data || []);
      if (custRes?.success) setCustomers(custRes.data);
      if (orderRes?.success) setOrders(orderRes.data);
      if (payRes?.success) setPayments(payRes.data);
      if (plansRes?.success) setAvailablePlans(plansRes.data);
      if (agentsRes?.success) {
        setAgents(agentsRes.data);
      } else {
        setError(agentsRes?.message || 'Failed to load delivery agents');
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchProfitLoss = async (tf = profitLossTimeframe) => {
    setProfitLossLoading(true);
    try {
      const res = await authFetch(`/vendor/profit-loss?timeframe=${tf}`);
      if (res?.success) {
        setProfitLossData(res.data);
      }
    } catch (err) {
      console.error('Failed to load profit loss data:', err);
    } finally {
      setProfitLossLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'profitLoss') {
      fetchProfitLoss(profitLossTimeframe);
    }
  }, [activeTab, profitLossTimeframe]);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileEmail(user.email || '');
      setProfileAddress(user.address || '');
      setVendorKeyId(user.razorpayKeyId || '');
      setVendorKeySecret('');
      setProfileSlots(user.deliverySlots || []);
    }
  }, [user]);

  // Handle settings update
  const handleUpdateSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        name: profileName,
        phone: profilePhone,
        email: profileEmail,
        address: profileAddress,
        razorpayKeyId: vendorKeyId,
        deliverySlots: profileSlots
      };

      if (vendorKeySecret) {
        payload.razorpayKeySecret = vendorKeySecret;
      }

      if (profilePassword) {
        payload.password = profilePassword;
      }

      const res = await authFetch('/vendor/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setSuccess('Profile settings updated successfully!');
        setProfilePassword('');
        setVendorKeySecret('');
        await refreshUser();
      } else {
        setError(res.message || 'Failed to update settings');
      }
    } catch (err) {
      setError('Connection failure');
    } finally {
      setLoading(false);
    }
  };

  // Handle save product (add or update)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (isStockUpdateOnly) {
      const stockAddition = Number(prodStock);
      if (!Number.isInteger(stockAddition) || stockAddition < 1) {
        return setError('Enter a whole number of units to add.');
      }
    } else if (!prodName || !prodPrice) {
      return setError('Name and Price are required');
    }

    try {
      const payload = {
        name: prodName,
        price: Number(prodPrice),
        purchasePrice: prodPurchasePrice !== '' ? Number(prodPurchasePrice) : 0,
        isReturnable: Boolean(prodIsReturnable),
        securityDeposit: prodIsReturnable && prodSecurityDeposit !== '' ? Number(prodSecurityDeposit) : 0,
        description: prodDesc,
        quantity: prodQty
      };

      let res;
      if (editingProduct && isStockUpdateOnly) {
        res = await authFetch(`/vendor/products/${editingProduct._id}`, {
          method: 'PUT',
          body: JSON.stringify({ stockAddition: Number(prodStock) })
        });
      } else if (editingProduct) {
        res = await authFetch(`/vendor/products/${editingProduct._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await authFetch('/vendor/products', {
          method: 'POST',
          body: JSON.stringify({ ...payload, stock: 0 })
        });
      }

      if (res.success) {
        setSuccess(isStockUpdateOnly ? 'Stock successfully added!' : (editingProduct ? 'Product successfully updated!' : 'Product successfully added!'));
        setProdName('');
        setProdPrice('');
        setProdPurchasePrice('');
        setProdIsReturnable(true);
        setProdSecurityDeposit('');
        setProdDesc('');
        setProdQty('');
        setProdStock('');
        setEditingProduct(null);
        setShowProductModal(false);
        fetchData();
      } else {
        setError(res.message || 'Failed to save product');
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    setError('');
    try {
      const res = await authFetch(`/vendor/products/${productId}`, {
        method: 'DELETE'
      });
      if (res.success) {
        setSuccess('Product successfully deleted!');
        fetchData();
      } else {
        setError(res.message || 'Failed to delete product');
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  // Custom customer pricing handlers
  const handleOpenCustomPriceModal = (customer) => {
    setError('');
    setSuccess('');
    setSelectedCustomerForPricing(customer);
    const initialMap = {};
    (customer.customPrices || []).forEach((cp) => {
      const pid = cp.productId?._id ? cp.productId._id.toString() : (cp.productId ? cp.productId.toString() : '');
      if (pid) {
        initialMap[pid] = cp.price;
      }
    });
    setCustomerCustomPrices(initialMap);
    setShowCustomPriceModal(true);
  };

  const handleSaveCustomPrices = async (e) => {
    e.preventDefault();
    if (!selectedCustomerForPricing) return;
    setError('');
    setSuccess('');

    try {
      const customPricesArray = Object.entries(customerCustomPrices)
        .filter(([_, price]) => price !== '' && !isNaN(Number(price)) && Number(price) >= 0)
        .map(([productId, price]) => ({
          productId,
          price: Number(price)
        }));

      const res = await authFetch(`/vendor/customers/${selectedCustomerForPricing.customerId}/custom-prices`, {
        method: 'PUT',
        body: JSON.stringify({ customPrices: customPricesArray })
      });

      if (res.success) {
        setSuccess(`Custom pricing updated for ${selectedCustomerForPricing.name}`);
        setShowCustomPriceModal(false);
        setSelectedCustomerForPricing(null);
        fetchData();
      } else {
        setError(res.message || 'Failed to update custom prices');
      }
    } catch (err) {
      setError('Connection failure while saving custom prices');
    }
  };

  // Damaged Jar & Penalty Handlers
  const handleOpenDamageModal = (customer) => {
    setError('');
    setSuccess('');
    setSelectedCustForDamage(customer);
    setDamageJarCount(1);
    setDamagePenaltyAmount('');
    setDamageDeductDeposit(false);
    setDamageNotes('');
    setShowDamageJarModal(true);
  };

  const handleSubmitDamage = async (e) => {
    e.preventDefault();
    if (!selectedCustForDamage) return;
    setError('');
    setSuccess('');

    const count = Number(damageJarCount);
    if (!Number.isInteger(count) || count <= 0) {
      return setError('Please enter a valid whole number of damaged jars.');
    }
    if (count > selectedCustForDamage.bottlesOutstanding) {
      return setError(`Cannot exceed customer's pending jars (${selectedCustForDamage.bottlesOutstanding}).`);
    }

    try {
      const res = await authFetch(`/vendor/customers/${selectedCustForDamage.customerId}/damage`, {
        method: 'POST',
        body: JSON.stringify({
          jarCount: count,
          penaltyAmount: damagePenaltyAmount !== '' ? Number(damagePenaltyAmount) : 0,
          notes: damageNotes,
          deductFromDeposit: damageDeductDeposit
        })
      });

      if (res.success) {
        setSuccess(res.message || 'Damaged jar write-off recorded successfully.');
        setShowDamageJarModal(false);
        setSelectedCustForDamage(null);
        fetchData();
      } else {
        setError(res.message || 'Failed to record damaged jar.');
      }
    } catch (err) {
      setError('Connection failure while recording damaged jar.');
    }
  };

  // Security Deposit Refund Handlers
  const handleOpenRefundModal = (customer) => {
    setError('');
    setSuccess('');
    setSelectedCustForDamage(customer);
    setRefundDepositAmount(customer.securityDeposit || '');
    setRefundAdjustBalance(false);
    setRefundNotes('');
    setShowRefundDepositModal(true);
  };

  const handleSubmitRefund = async (e) => {
    e.preventDefault();
    if (!selectedCustForDamage) return;
    setError('');
    setSuccess('');

    const amt = Number(refundDepositAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return setError('Please enter a valid refund amount.');
    }

    try {
      const res = await authFetch(`/vendor/customers/${selectedCustForDamage.customerId}/refund-deposit`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          adjustWithBalance: refundAdjustBalance,
          notes: refundNotes
        })
      });

      if (res.success) {
        setSuccess(res.message || 'Security deposit refund processed successfully.');
        setShowRefundDepositModal(false);
        setSelectedCustForDamage(null);
        fetchData();
      } else {
        setError(res.message || 'Failed to process deposit refund.');
      }
    } catch (err) {
      setError('Connection failure while processing deposit refund.');
    }
  };

  // Handle record purchase / stock inward
  const handleRecordPurchase = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!purchaseProdId) return setError('Please select a product to purchase');
    const qty = Number(purchaseQty);
    if (!Number.isInteger(qty) || qty <= 0) return setError('Quantity must be a positive whole number');

    const unitCostNum = Number(purchaseUnitCost || 0);
    const totalAmountNum = Number(purchaseTotalAmount) > 0 ? Number(purchaseTotalAmount) : unitCostNum * qty;

    try {
      const res = await authFetch('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          productId: purchaseProdId,
          quantity: qty,
          unitCost: unitCostNum,
          totalAmount: totalAmountNum,
          supplierName: purchaseSupplier,
          invoiceNumber: purchaseInvoice,
          purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString(),
          notes: purchaseNotes
        })
      });

      if (res.success) {
        setSuccess(res.message || 'Purchase successfully recorded and stock added!');
        setShowPurchaseModal(false);
        setPurchaseProdId('');
        setPurchaseQty('');
        setPurchaseSupplier('');
        setPurchaseUnitCost('');
        setPurchaseTotalAmount('');
        setPurchaseInvoice('');
        setPurchaseNotes('');
        setPurchaseDate('');
        fetchData();
      } else {
        setError(res.message || 'Failed to record purchase');
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  // Handle link/add customer
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!custPhone) return setError('Customer phone number is required');
    if (custPhone.length !== 10) return setError('Customer phone number must be exactly 10 digits');

    try {
      const res = await authFetch('/vendor/customers', {
        method: 'POST',
        body: JSON.stringify({
          phone: custPhone,
          name: custName || undefined,
          address: custAddress || undefined
        })
      });

      if (res.success) {
        setSuccess('Customer linked successfully!');
        setCustPhone('');
        setCustName('');
        setCustAddress('');
        setShowNewCustFields(false);
        setShowCustomerModal(false);
        fetchData();
      } else {
        if (res.message.includes('does not exist')) {
          setShowNewCustFields(true);
          setError('Phone number is not registered yet. Please enter Name to create profile.');
        } else {
          setError(res.message);
        }
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  // Handle log order (delivery)
  const handleAddOrder = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedCustId || !selectedProdId || orderQty === '') {
      return setError('Please complete all delivery fields');
    }
    if (Number(orderQty) === 0 && Number(bottlesReturned) === 0) {
      return setError('Either delivery quantity or return quantity must be greater than 0');
    }
    if (Number(bottlesDelivered) > Number(orderQty)) {
      return setError('Delivered bottles cannot exceed the product quantity');
    }

    try {
      const res = await authFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustId,
          products: [{ productId: selectedProdId, quantity: Number(orderQty) }],
          bottlesDelivered: Number(bottlesDelivered),
          bottlesReturned: Number(bottlesReturned),
          status: 'delivered' // Vendor logs delivery directly
        })
      });

      if (res.success) {
        setSuccess('Water delivery logged and customer balance updated!');
        setSelectedCustId('');
        setSelectedProdId('');
        setOrderQty(1);
        setBottlesDelivered(1);
        setBottlesReturned(0);
        setShowOrderModal(false);
        fetchData();
      } else {
        setError(res.message || 'Failed to log delivery');
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  // Handle log payment
  const handleAddPayment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!payCustId || !payAmount) return setError('Customer and Amount are required');

    try {
      const res = await authFetch('/orders/payments', {
        method: 'POST',
        body: JSON.stringify({
          customerId: payCustId,
          amount: Number(payAmount),
          paymentMethod: payCashOnly ? 'cash' : payMethod,
          notes: payNotes
        })
      });

      if (res.success) {
        setSuccess(payCashOnly ? 'Cash payment recorded and customer balance deducted!' : 'Payment recorded and customer balance deducted!');
        setPayCustId('');
        setPayAmount('');
        setPayNotes('');
        setPayCashOnly(false);
        setShowPaymentModal(false);
        fetchData();
      } else {
        setError(res.message || 'Failed to record payment');
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  const handleOpenCustomerPayment = (customer) => {
    setError('');
    setSuccess('');
    setPayCustId(customer.customerId);
    setPayAmount('');
    setPayMethod('cash');
    setPayNotes('');
    setPayCashOnly(true);
    setShowPaymentModal(true);
  };

  const handleProcessOrder = async (orderId, action, delQty, retQty, paymentMethod, paymentAmount) => {
    try {
      const res = await authFetch(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: action,
          bottlesDelivered: Number(delQty || 0),
          bottlesReturned: Number(retQty || 0),
          paymentMethod: paymentMethod || 'due',
          paymentAmount: paymentMethod === 'cash' ? Number(paymentAmount || 0) : 0
        })
      });

      if (res.success) {
        setSuccess(`Order successfully marked as ${action}!`);
        fetchData();
        return { success: true };
      } else {
        return { success: false, message: res.message || 'Failed to process order' };
      }
    } catch (err) {
      return { success: false, message: 'Connection failure' };
    }
  };

  const handleAssignAgent = async (orderId, agentId) => {
    setError('');
    setSuccess('');
    try {
      const res = await authFetch(`/vendor/orders/${orderId}/agent`, {
        method: 'PUT',
        body: JSON.stringify({ agentId: agentId || null })
      });
      if (!res.success) {
        setError(res.message || 'Failed to update delivery assignment');
        return;
      }
      setSuccess(agentId ? 'Delivery agent assigned.' : 'Delivery agent unassigned.');
      await fetchData();
    } catch (err) {
      setError('Connection failure');
    }
  };

  const handleViewRecords = async (cust) => {
    setSelectedCustForRecords(cust);
    setRecordsSubTab('orders');
    setRecordsOrderPage(1);
    setRecordsPaymentPage(1);
    setError('');
    setSuccess('');
    setActiveTab('customerRecords');
  };

  const handleOpenProcessReqModal = (order) => {
    const totalQty = order.products.reduce((acc, curr) => acc + curr.quantity, 0);
    setProcessingOrder(order);
    setReqTotalQty(totalQty);
    setReqBottlesDelivered(totalQty);
    setReqBottlesReturned(0);
    setReqPaymentMethod('due');
    setReqPaymentAmount(order.totalAmount || 0);
    setReqError('');
    setShowProcessReqModal(true);
  };

  const handleConfirmProcessReq = async (e) => {
    e.preventDefault();
    if (!processingOrder) return;
    const del = Number(reqBottlesDelivered);
    const ret = Number(reqBottlesReturned);
    if (del > reqTotalQty) {
      setReqError(`Delivered bottles cannot exceed the requested quantity (${reqTotalQty}).`);
      return;
    }
    const result = await handleProcessOrder(processingOrder._id, 'delivered', del, ret, reqPaymentMethod, reqPaymentAmount);
    if (result.success) {
      setShowProcessReqModal(false);
      setProcessingOrder(null);
    } else {
      setReqError(result.message);
    }
  };

  const handleDownloadPDF = (customerId = '') => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (customerId) {
      params.append('customerId', customerId);
    }
    if (token) {
      params.append('token', token);
    }
    window.open(`${API_URL}/orders/pdf-report?${params.toString()}`, '_blank');
  };

  // Initiate Razorpay checkout for chosen subscription plan
  const handleSubscribePlan = async (plan) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setError('Failed to load Razorpay SDK. Verify internet connectivity.');
        setLoading(false);
        return;
      }

      const res = await authFetch('/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({ planId: plan._id })
      });

      if (!res.success) {
        setError(res.message || 'Failed to initiate checkout order.');
        setLoading(false);
        return;
      }

      const { orderId, amount, currency, keyId } = res;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: import.meta.env.VITE_PROJECT_NAME || 'H2O Delivery Management',
        description: `Purchase subscription: ${plan.name}`,
        order_id: orderId,
        handler: async function (response) {
          setLoading(true);
          try {
            const verifyRes = await authFetch('/payment/verify', {
              method: 'POST',
              body: JSON.stringify({
                planId: plan._id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            if (verifyRes.success) {
              setSuccess('Subscription plan activated successfully!');
              fetchData(); // reload status
            } else {
              setError(verifyRes.message || 'Cryptographic signature verification failed.');
            }
          } catch (err) {
            setError('Verification request failed.');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#0286c7'
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();

    } catch (err) {
      setError('Checkout initiation failure');
      setLoading(false);
    }
  };

  const isSubActive = subStatus && subStatus.active;
  const pendingOrdersCount = (orders || []).filter(o => o.status === 'pending').length;
  const lowStockCount = (products || []).filter(p => Number(p.stock || 0) < 5).length;
  const userInitials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'VA';

  const isItemActive = (id) => {
    if (id === 'customers') return activeTab === 'customers' || activeTab === 'customerRecords';
    return activeTab === id;
  };

  const navSections = [
    {
      title: 'CORE',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          icon: <Activity size={17} />,
          badge: null
        },
        {
          id: 'subscription',
          label: 'Subscription',
          icon: <Calendar size={17} />,
          badge: isSubActive
            ? { label: 'Active', color: 'emerald' }
            : { label: 'Inactive', color: 'rose' }
        }
      ]
    },
    {
      title: 'CATALOG & INVENTORY',
      items: [
        {
          id: 'products',
          label: 'Products',
          icon: <Package size={17} />,
          requiresSub: true,
          badge: products.length > 0 ? { label: products.length, color: 'slate' } : null
        },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: <Boxes size={17} />,
          requiresSub: true,
          badge: lowStockCount > 0 ? { label: `${lowStockCount} low`, color: 'amber' } : null
        },
        {
          id: 'purchases',
          label: 'Purchases',
          icon: <ShoppingBag size={17} />,
          requiresSub: true,
          badge: purchases.length > 0 ? { label: purchases.length, color: 'slate' } : null
        }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        {
          id: 'customers',
          label: 'Customer Tracker',
          icon: <Users size={17} />,
          requiresSub: true,
          badge: customers.length > 0 ? { label: customers.length, color: 'slate' } : null
        },
        {
          id: 'deliveries',
          label: 'Log Deliveries',
          icon: <Truck size={17} />,
          requiresSub: true,
          badge: pendingOrdersCount > 0 ? { label: `${pendingOrdersCount} new`, color: 'sky', pulse: true } : null
        },
        {
          id: 'agents',
          label: 'Delivery Agents',
          icon: <UserCheck size={17} />,
          badge: agents.length > 0 ? { label: agents.length, color: 'slate' } : null
        }
      ]
    },
    {
      title: 'FINANCE & INSIGHTS',
      items: [
        {
          id: 'profitLoss',
          label: 'Profit & Loss',
          icon: <TrendingUp size={17} />,
          requiresSub: true,
          badge: { label: 'New', color: 'emerald' }
        },
        {
          id: 'payments',
          label: 'Collect Payments',
          icon: <DollarSign size={17} />,
          requiresSub: true,
          badge: null
        }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          icon: <Settings size={17} />,
          badge: null
        }
      ]
    }
  ];

  // Analytics calculations based on selected timeframe
  const getFilteredAnalyticsData = () => {
    const now = new Date();
    
    // Today date boundaries (local timezone)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Yesterday date boundaries
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayEnd = todayStart;

    // Last Month (past 30 days) boundary
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let filteredOrders = [];
    let filteredPayments = [];

    if (analyticsTimeframe === 'today') {
      filteredOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= todayStart && d < todayEnd;
      });
      filteredPayments = payments.filter(p => {
        const d = new Date(p.paymentDate);
        return d >= todayStart && d < todayEnd;
      });
    } else if (analyticsTimeframe === 'yesterday') {
      filteredOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= yesterdayStart && d < yesterdayEnd;
      });
      filteredPayments = payments.filter(p => {
        const d = new Date(p.paymentDate);
        return d >= yesterdayStart && d < yesterdayEnd;
      });
    } else {
      // month (last 30 days)
      filteredOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= thirtyDaysAgo;
      });
      filteredPayments = payments.filter(p => {
        const d = new Date(p.paymentDate);
        return d >= thirtyDaysAgo;
      });
    }

    // 1. Water Supplied (delivered bottles count)
    const waterSupplied = filteredOrders
      .filter(o => o.status === 'delivered')
      .reduce((acc, curr) => acc + (curr.bottlesDelivered || 0), 0);

    // 2. Total Orders Received
    const totalOrders = filteredOrders.length;

    // 3. Payments Collected
    const paymentsCollected = filteredPayments
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);


    // Grouping for Today/Yesterday Slot Bar Chart
    const slotBottles = { Morning: 0, Afternoon: 0, Evening: 0, Other: 0 };
    filteredOrders.filter(o => o.status === 'delivered').forEach(o => {
      const slot = o.deliverySlot ? o.deliverySlot.toLowerCase() : '';
      const qty = Number(o.bottlesDelivered) || 0;
      if (slot.includes('morning') || slot.includes('8 am')) {
        slotBottles.Morning += qty;
      } else if (slot.includes('afternoon') || slot.includes('12 pm')) {
        slotBottles.Afternoon += qty;
      } else if (slot.includes('evening') || slot.includes('4 pm')) {
        slotBottles.Evening += qty;
      } else {
        // Fallback to time of creation
        const hour = new Date(o.createdAt).getHours();
        if (hour < 12) slotBottles.Morning += qty;
        else if (hour < 16) slotBottles.Afternoon += qty;
        else if (hour < 20) slotBottles.Evening += qty;
        else slotBottles.Other += qty;
      }
    });

    // Grouping for Today/Yesterday Payment Method
    const payMethods = { Cash: 0, Online: 0, Other: 0 };
    filteredPayments.forEach(p => {
      const method = p.paymentMethod ? p.paymentMethod.toLowerCase() : 'cash';
      const amt = Number(p.amount) || 0;
      if (method === 'cash') payMethods.Cash += amt;
      else if (method === 'online') payMethods.Online += amt;
      else payMethods.Other += amt;
    });

    // Grouping for 30 Days trend
    const trendData = [];
    if (analyticsTimeframe === 'month') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const dateKey = d.toDateString();

        const dayOrders = filteredOrders.filter(o => {
          const od = new Date(o.createdAt || o.deliveryDate);
          return od.toDateString() === dateKey && o.status === 'delivered';
        });

        const dayPayments = filteredPayments.filter(p => {
          const pd = new Date(p.paymentDate);
          return pd.toDateString() === dateKey;
        });

        const supplied = dayOrders.reduce((acc, curr) => acc + Number(curr.bottlesDelivered || 0), 0);
        const paymentsVal = dayPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

        trendData.push({
          label: dateString,
          dateKey,
          supplied,
          payments: paymentsVal
        });
      }
    }


    return {
      waterSupplied,
      totalOrders,
      paymentsCollected,
      slotBottles,
      payMethods,
      trendData
    };
  };

  const {
    waterSupplied,
    totalOrders,
    paymentsCollected,
    slotBottles,
    payMethods,
    trendData
  } = getFilteredAnalyticsData();

  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  const recentOrders = orders.filter((order) => {
    const date = new Date(order.deliveryDate || order.createdAt).getTime();
    return Number.isFinite(date) && date >= thirtyDaysAgo && date <= now;
  });
  const recentPayments = payments.filter((payment) => {
    const date = new Date(payment.paymentDate).getTime();
    return Number.isFinite(date) && date >= thirtyDaysAgo && date <= now;
  });

  const pendingRequestsSection = (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white flex flex-wrap items-center gap-2">
        <Truck size={18} className="text-sky-400" />
        Pending Delivery Requests from Clients
        {!isSubActive && (
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 border border-amber-500/20 rounded-full animate-pulse">
            Actions Locked (Subscription Ended)
          </span>
        )}
      </h2>
      <div className="glass-panel rounded-2xl overflow-hidden border border-marine-800">
        <div className="p-4 bg-marine-card/50 border-b border-marine-800 text-xs font-bold text-slate-400 uppercase">
          Requests Queue
        </div>
        <div className="divide-y divide-marine-800/40">
          {orders.filter(o => o.status === 'pending').map((o) => (
            <div key={o._id} className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:bg-marine-card/10 transition-colors">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">{o.customerId?.name}</span>
                  {o.deliverySlot && (
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full" title="Preferred delivery slot">
                      {o.deliverySlot}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Phone: {o.customerId?.phone} | Products:{' '}
                  <span className="text-slate-300 font-medium">
                    {o.products.map((p) => {
                      const requested = p.requestedQuantity ?? p.quantity;
                      const delivered = p.deliveredQuantity ?? (o.status === 'delivered' ? p.quantity : null);
                      return `${p.name} (${delivered !== null && delivered !== requested ? `${delivered}/${requested}` : `x${requested}`})`;
                    }).join(', ')}
                  </span>
                </div>
                {o.deliveryAddress && (
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin size={12} className="text-sky-400 shrink-0" />
                    <span>Delivery Address: <span className="text-slate-300 font-semibold">{o.deliveryAddress}</span></span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  disabled={!isSubActive}
                  onClick={() => handleOpenProcessReqModal(o)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white rounded text-xs font-semibold cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={!isSubActive ? "Please purchase a plan to unlock actions" : ""}
                >
                  Mark Delivered
                </button>
                <button
                  disabled={!isSubActive}
                  onClick={() => handleProcessOrder(o._id, 'cancelled')}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-900/30 text-rose-400 rounded text-xs font-semibold cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={!isSubActive ? "Please purchase a plan to unlock actions" : ""}
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
          {orders.filter(o => o.status === 'pending').length === 0 && (
            <div className="p-6 text-center text-slate-500 text-sm">
              No pending water requests at this moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (

    <div className="h-dvh overflow-hidden flex flex-col md:flex-row bg-marine-950 text-slate-100">
      
      {/* MOBILE HEADER BAR */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-marine-sidebar border-b border-marine-800 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-xs">
            <Building size={16} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">Vendor Panel</h2>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase font-semibold block">
              {import.meta.env.VITE_PROJECT_NAME || 'Distributor Console'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-sky-600 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* MOBILE DRAWER BACKDROP */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION (SLIDING DRAWER MENU) */}
      <aside className={`fixed inset-y-0 left-0 w-68 md:w-72 bg-marine-sidebar border-r border-marine-800 flex flex-col justify-between z-40 transition-transform duration-300 md:static md:translate-x-0 shrink-0 h-full ${
        sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
        {/* Header branding */}
        <div className="p-4 border-b border-marine-800/80 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-sky-600/25 shrink-0">
                <Building size={20} className="text-white" />
                <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-marine-sidebar ${
                  isSubActive ? 'bg-emerald-400' : 'bg-rose-400'
                }`} />
              </div>
              <div className="min-w-0">
                <h2 className="font-extrabold text-slate-900 dark:text-white text-sm truncate leading-tight">
                  {user?.name || 'Vendor Hub'}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase font-bold truncate">
                    {isSubActive ? (subStatus?.planName || 'Pro Plan') : 'Plan Inactive'}
                  </span>
                </div>
              </div>
            </div>
            {/* Close button for mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 md:hidden rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Items (Grouped with smooth scrollbar) */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isItemActive(item.id);
                  const disabled = item.requiresSub && !isSubActive;
                  return (
                    <button
                      key={item.id}
                      disabled={disabled}
                      onClick={() => {
                        setActiveTab(item.id);
                        setError('');
                        setSuccess('');
                        setSidebarOpen(false);
                      }}
                      className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        disabled
                          ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                          : active
                          ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-md shadow-sky-600/25 font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white/90 shadow-xs" />
                      )}

                      {/* Icon */}
                      <span className={`shrink-0 transition-transform group-hover:scale-105 ${
                        active ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-sky-500'
                      }`}>
                        {item.icon}
                      </span>

                      {/* Label */}
                      <span className="truncate flex-1 text-left">{item.label}</span>

                      {/* Lock if requires active plan */}
                      {disabled && (
                        <Lock size={12} className="shrink-0 text-slate-400 opacity-60 ml-auto" />
                      )}

                      {/* Badge if available */}
                      {item.badge && (!item.requiresSub || isSubActive) && (
                        <span className={`shrink-0 ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.badge.color === 'emerald'
                            ? active ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : item.badge.color === 'rose'
                            ? active ? 'bg-white/20 text-white' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : item.badge.color === 'amber'
                            ? active ? 'bg-white/20 text-white' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : item.badge.color === 'sky'
                            ? active ? 'bg-white/20 text-white' : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25'
                            : active ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        } ${item.badge.pulse ? 'animate-pulse' : ''}`}>
                          {item.badge.label}
                        </span>
                      )}

                      {/* Active chevron */}
                      {active && (
                        <ChevronRight size={13} className="ml-1 opacity-70 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="p-3 border-t border-marine-800/80 dark:border-white/5 space-y-2 bg-marine-sidebar/60">
          {/* Light/Dark Mode toggle button */}
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Theme</span>
            <ThemeToggle />
          </div>

          {/* User profile / Name card */}
          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-marine-800/80 dark:border-white/5 flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-2xs shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Vendor Admin'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.phone || user?.email || 'vendor@water.com'}</p>
            </div>
          </div>

          {/* Action buttons (Sync & Logout) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => { fetchData(); setSidebarOpen(false); }}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-marine-800 dark:border-white/5 transition-all cursor-pointer shadow-2xs"
              title="Sync Dashboard"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Sync</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/30 transition-all cursor-pointer shadow-2xs"
              title="Logout Account"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="min-h-0 min-w-0 flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* Banner Alert for Expired/Inactive Subscriptions */}
        {!isSubActive && (
          <div className="flex items-center gap-4 p-4 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <AlertTriangle className="shrink-0 animate-float" size={32} />
            <div>
              <h3 className="font-bold text-base">Dashboard Actions Locked</h3>
              <p className="text-xs text-amber-400/80 mt-0.5">
                No active subscription plan was found for your account. Please navigate to the Subscription tab to purchase or renew a plan to unlock your dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Banner Notification */}
        {error && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            {success}
          </div>
        )}

        {/* OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <section className="space-y-6 animate-tab-transition">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Vendor Overview</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Status overview, active stats, and subscription limits.</p>
              </div>
              {isSubActive && (
                <button
                  onClick={() => handleDownloadPDF()}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors shadow-lg shadow-sky-950/40 self-start sm:self-center"
                >
                  <Download size={16} />
                  Download PDF Report
                </button>
              )}
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Card 2: Cumulative outstanding payments */}
              <div className="glass-panel rounded-2xl p-6 border border-marine-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Outstanding Payments Left</span>
                  <IndianRupee size={18} className="text-amber-500" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  Rs. {customers.reduce((acc, curr) => acc + curr.balance, 0)}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Sum of all payments left/unpaid across all connected clients.</p>
              </div>

              {/* Card 3: Outstanding Bottles */}
              <div className="glass-panel rounded-2xl p-6 border border-marine-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Bottles Outstanding</span>
                  <Truck size={18} className="text-teal-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {customers.reduce((acc, curr) => acc + curr.bottlesOutstanding, 0)} Bottles
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Sum of empty bottles remaining at client premises.</p>
              </div>

            </div>

            {/* ANALYTICS SECTION */}
            <div className="glass-panel rounded-2xl p-6 border border-marine-800 space-y-6">
              
              {/* Header with Timeframe Toggles */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-marine-800/60 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity size={18} className="text-sky-400 animate-pulse-glow" />
                    Fulfillment & Financial Analytics
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Track your supplied water volume and payment collections.</p>
                </div>
                
                {/* 3-Toggle Selector */}
                <div className="inline-flex bg-marine-950 p-1 rounded-xl border border-marine-850 self-start sm:self-center">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'month', label: 'Last Month' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setAnalyticsTimeframe(tab.id);
                        setHoveredPoint(null);
                        setHoveredBar(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        analyticsTimeframe === tab.id
                          ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/40'
                          : 'text-slate-400 hover:text-sky-400 hover:bg-sky-600/10'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 Analytical Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Water Supplied */}
                <div className="bg-marine-card/30 border border-marine-800/40 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Water Supplied</span>
                    <Truck size={14} className="text-sky-400" />
                  </div>
                  <div className="text-xl font-extrabold text-white">{waterSupplied} <span className="text-xs font-normal text-slate-400">Jars</span></div>
                  <p className="text-[9px] text-slate-500 mt-1">Jars delivered in period</p>
                </div>

                {/* Total Orders Received */}
                <div className="bg-marine-card/30 border border-marine-800/40 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Orders Received</span>
                    <FileText size={14} className="text-cyan-400" />
                  </div>
                  <div className="text-xl font-extrabold text-white">{totalOrders} <span className="text-xs font-normal text-slate-400">Orders</span></div>
                  <p className="text-[9px] text-slate-500 mt-1">Orders created in period</p>
                </div>

                {/* Payments Collected */}
                <div className="bg-marine-card/30 border border-marine-800/40 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Collected</span>
                    <IndianRupee size={14} className="text-emerald-400" />
                  </div>
                  <div className="text-xl font-extrabold text-emerald-450">Rs. {paymentsCollected}</div>
                  <p className="text-[9px] text-slate-500 mt-1">Total payments received</p>
                </div>

                {/* Total Due */}
                <div className="bg-marine-card/30 border border-marine-800/40 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Due</span>
                    <IndianRupee size={14} className="text-amber-500" />
                  </div>
                  <div className="text-xl font-extrabold ">Rs. {customers.reduce((acc, curr) => acc + curr.balance, 0)}</div>
                  <p className="text-[9px] text-slate-500 mt-1">Pending from customers</p>
                </div>
              </div>

              {/* Chart Render Block */}
              <div className="bg-marine-950/40 border border-marine-850/50 rounded-2xl p-4 md:p-6 min-h-[280px]">
                {analyticsTimeframe === 'month' ? (
                  // DUAL-LINE TREND CHART
                  (() => {
                    const maxSupplied = Math.max(...trendData.map(d => d.supplied), 5);
                    const maxPayments = Math.max(...trendData.map(d => d.payments), 100);

                    const padL = 55;
                    const padR = 55;
                    const padT = 20;
                    const padB = 40;
                    const w = 700;
                    const h = 220;
                    const gW = w - padL - padR;
                    const gH = h - padT - padB;

                    // Compute points
                    const pointsSupplied = trendData.map((d, i) => {
                      const x = padL + (i / 29) * gW;
                      const sVal = Number(d.supplied) || 0;
                      const y = padT + gH - (maxSupplied > 0 ? (sVal / maxSupplied) * gH : 0);
                      return { x, y, data: d };
                    });

                    const pointsPayments = trendData.map((d, i) => {
                      const x = padL + (i / 29) * gW;
                      const pVal = Number(d.payments) || 0;
                      const y = padT + gH - (maxPayments > 0 ? (pVal / maxPayments) * gH : 0);
                      return { x, y, data: d };
                    });

                    // Build path strings
                    const lineSuppliedPath = pointsSupplied.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const areaSuppliedPath = `${lineSuppliedPath} L ${pointsSupplied[29].x} ${padT + gH} L ${pointsSupplied[0].x} ${padT + gH} Z`;

                    const linePaymentsPath = pointsPayments.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const areaPaymentsPath = `${linePaymentsPath} L ${pointsPayments[29].x} ${padT + gH} L ${pointsPayments[0].x} ${padT + gH} Z`;

                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white uppercase tracking-wider font-mono text-[10px]">30-Day Trend Overview</span>
                          <div className="flex items-center gap-4 text-[10px]">
                            <span className="flex items-center gap-1.5 font-medium text-sky-400">
                              <span className="w-2.5 h-2.5 rounded bg-sky-500 inline-block" />
                              Water Supplied (Jars)
                            </span>
                            <span className="flex items-center gap-1.5 font-medium text-emerald-450">
                              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                              Payments Collected (Rs)
                            </span>
                          </div>
                        </div>

                        {/* Interactive SVG */}
                        <div className="relative">
                          <svg viewBox={`0 0 ${w} ${h}`} className="w-full overflow-visible">
                            <defs>
                              <linearGradient id="glowSupplied" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                              </linearGradient>
                              <linearGradient id="glowPayments" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* Horizontal Gridlines (4 lines) */}
                            {[0, 0.33, 0.67, 1].map((pct, idx) => {
                              const y = padT + gH * pct;
                              const valS = Math.round(maxSupplied * (1 - pct));
                              const valP = Math.round(maxPayments * (1 - pct));
                              return (
                                <g key={idx} className="opacity-45">
                                  <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#334155" strokeDasharray="3 3" />
                                  {/* Left axis (Water) */}
                                  <text x={padL - 10} y={y + 4} textAnchor="end" fill="#94a3b8" className="text-[9px] font-mono font-medium">{valS}</text>
                                  {/* Right axis (Payments) */}
                                  <text x={w - padR + 10} y={y + 4} textAnchor="start" fill="#94a3b8" className="text-[9px] font-mono font-medium">Rs.{valP}</text>
                                </g>
                              );
                            })}

                            {/* Vertical X-axis ticks (Weekly) */}
                            {trendData.filter((_, idx) => [0, 6, 12, 18, 24, 29].includes(idx)).map((d, idx) => {
                              const i = trendData.indexOf(d);
                              const x = padL + (i / 29) * gW;
                              return (
                                <g key={idx} className="opacity-45">
                                  <line x1={x} y1={padT} x2={x} y2={padT + gH} stroke="#1e293b" />
                                  <text x={x} y={padT + gH + 18} textAnchor="middle" fill="#64748b" className="text-[8px] font-mono font-semibold">{d.label}</text>
                                </g>
                              );
                            })}


                            {/* Gradient Area under curves */}
                            <path d={areaSuppliedPath} fill="url(#glowSupplied)" />
                            <path d={areaPaymentsPath} fill="url(#glowPayments)" />

                            {/* Trend Line Paths */}
                            <path d={lineSuppliedPath} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={linePaymentsPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                            {/* Hoverable Interactive Circles */}
                            {pointsSupplied.map((p, i) => (
                              <g key={i} className="cursor-pointer">
                                {/* Invisible larger hover target */}
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="10"
                                  fill="transparent"
                                  onMouseEnter={() => {
                                    setHoveredPoint({
                                      x: p.x,
                                      yS: p.y,
                                      yP: pointsPayments[i].y,
                                      label: p.data.label,
                                      supplied: p.data.supplied,
                                      payments: pointsPayments[i].data.payments
                                    });
                                  }}
                                  onMouseLeave={() => setHoveredPoint(null)}
                                />
                                {/* Visible line dots (only on hover or selected index) */}
                                {(hoveredPoint && hoveredPoint.label === p.data.label) && (
                                  <>
                                    <circle cx={p.x} cy={p.y} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                                    <circle cx={p.x} cy={pointsPayments[i].y} r="5" fill="#34d399" stroke="#ffffff" strokeWidth="1.5" />
                                  </>
                                )}
                              </g>
                            ))}
                          </svg>

                          {/* Hover Tooltip Overlay */}
                          {hoveredPoint && (
                            <div
                              className="absolute bg-white border border-marine-800 rounded-xl p-3 shadow-xl text-[10px] space-y-1.5 z-30 pointer-events-none"
                              style={{
                                left: `${(hoveredPoint.x / w) * 100}%`,
                                top: `${(Math.min(hoveredPoint.yS, hoveredPoint.yP) / h) * 100}%`,
                                transform: 'translate(-50%, -115%)'
                              }}
                            >
                              <div className="font-bold text-slate-800 font-mono pb-1 border-b border-marine-800/80">{hoveredPoint.label}</div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-500">Supplied:</span>
                                <span className="font-bold text-sky-400">{hoveredPoint.supplied} Jars</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-500">Collected:</span>
                                <span className="font-bold text-emerald-400">Rs. {hoveredPoint.payments}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // TODAY/YESTERDAY BREAKDOWN BAR CHARTS
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Left: Delivery Slots Bar Chart */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white uppercase tracking-wider font-mono text-[10px]">Delivery Slots Volume</span>
                        <span className="text-[10px] text-slate-400">Jars Supplied</span>
                      </div>
                      
                      {(() => {
                        const data = [
                          { label: 'Morning', val: slotBottles.Morning, color: 'bg-sky-500' },
                          { label: 'Afternoon', val: slotBottles.Afternoon, color: 'bg-cyan-500' },
                          { label: 'Evening', val: slotBottles.Evening, color: 'bg-indigo-500' },
                          { label: 'Other/Direct', val: slotBottles.Other, color: 'bg-teal-500' }
                        ];
                        const maxVal = Math.max(...data.map(d => d.val), 5);
                        
                        return (
                          <div className="space-y-4 pt-2">
                            {data.map((item, idx) => {
                              const pct = Math.round((item.val / maxVal) * 100);
                              return (
                                <div
                                  key={idx}
                                  className="space-y-1 cursor-pointer relative group"
                                >
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-slate-400">{item.label}</span>
                                    <span className="text-white font-bold">{item.val} Jars</span>
                                  </div>
                                  
                                  {/* Bar container */}
                                  <div className="w-full bg-marine-950 rounded-full h-3.5 overflow-hidden border border-marine-900 shadow-inner relative">
                                    <div
                                      className={`h-full rounded-full transition-all duration-700 ${item.color}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>

                                  {/* Tooltip on bar hover */}
                                  <div className="absolute -top-6 right-0 bg-white border border-marine-800 text-slate-700 text-[9px] font-mono px-2 py-0.5 rounded shadow-md z-10 font-bold pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                    {pct}% of maximum slot volume
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Right: Payment Collections Breakdown */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white uppercase tracking-wider font-mono text-[10px]">Payment Channels Collection</span>
                        <span className="text-[10px] text-slate-400">Total Collected</span>
                      </div>

                      {(() => {
                        const total = payMethods.Cash + payMethods.Online + payMethods.Other;
                        const cashPct = total > 0 ? Math.round((payMethods.Cash / total) * 100) : 0;
                        const onlinePct = total > 0 ? Math.round((payMethods.Online / total) * 100) : 0;
                        const otherPct = total > 0 ? Math.round((payMethods.Other / total) * 100) : 0;

                        return (
                          <div className="space-y-6 pt-4 flex flex-col justify-center h-full min-h-[160px]">
                            {total > 0 ? (
                              <div className="space-y-4">
                                {/* Segmented Progress Bar */}
                                <div className="w-full h-5 rounded-full overflow-hidden border border-marine-900 bg-marine-950 flex shadow-inner">
                                  {payMethods.Cash > 0 && <div className="bg-amber-500 h-full transition-all" style={{ width: `${cashPct}%` }} title={`Cash: ${cashPct}%`} />}
                                  {payMethods.Online > 0 && <div className="bg-emerald-500 h-full transition-all" style={{ width: `${onlinePct}%` }} title={`Online: ${onlinePct}%`} />}
                                  {payMethods.Other > 0 && <div className="bg-slate-500 h-full transition-all" style={{ width: `${otherPct}%` }} title={`Other: ${otherPct}%`} />}
                                </div>

                                {/* Legend and Stats */}
                                <div className="grid grid-cols-3 gap-2 pt-2">
                                  <div className="flex flex-col items-center p-2 bg-marine-card/20 border border-marine-850/40 rounded-xl">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                      <span className="w-2 h-2 rounded bg-amber-500 inline-block" />
                                      Cash
                                    </span>
                                    <span className="text-xs font-extrabold text-white">Rs. {payMethods.Cash}</span>
                                    <span className="text-[8px] text-slate-500">{cashPct}%</span>
                                  </div>
                                  
                                  <div className="flex flex-col items-center p-2 bg-marine-card/20 border border-marine-850/40 rounded-xl">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                      <span className="w-2 h-2 rounded bg-emerald-500 inline-block" />
                                      Online
                                    </span>
                                    <span className="text-xs font-extrabold text-emerald-400">Rs. {payMethods.Online}</span>
                                    <span className="text-[8px] text-slate-500">{onlinePct}%</span>
                                  </div>

                                  <div className="flex flex-col items-center p-2 bg-marine-card/20 border border-marine-850/40 rounded-xl">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                      <span className="w-2 h-2 rounded bg-slate-500 inline-block" />
                                      Other
                                    </span>
                                    <span className="text-xs font-extrabold text-white">Rs. {payMethods.Other}</span>
                                    <span className="text-[8px] text-slate-500">{otherPct}%</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-slate-500 text-sm italic bg-marine-card/10 border border-marine-800 rounded-2xl">
                                No payment transaction collections recorded for this timeframe.
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {pendingRequestsSection}
          </section>
        )}

        {/* SUBSCRIPTION TAB */}
        {activeTab === 'subscription' && (
          <section className="space-y-6 animate-tab-transition">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Subscription Management</h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">Monitor your subscription status, limits, and upgrade or renew packages.</p>
            </div>

            {/* Subscription Status Card */}
            <div className="glass-panel rounded-2xl p-6 border border-marine-800 max-w-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Current Subscription Status</span>
                <Calendar size={18} className="text-sky-400" />
              </div>
              {subStatus?.active ? (
                <div className="space-y-2">
                  <div className="text-xl font-bold text-white">{subStatus.subscription.planId?.name}</div>
                  <div className="text-xs text-slate-400">
                    Expires:{' '}
                    <span className="text-white font-medium">
                      {new Date(subStatus.subscription.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Progress Bar Customer Limit */}
                  <div className="pt-2">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Customer Limit usage</span>
                      <span className="font-bold text-white">
                        {subStatus.customerCount} / {subStatus.userLimit}
                      </span>
                    </div>
                    <div className="w-full bg-marine-950 rounded-full h-2 overflow-hidden border border-marine-800">
                      <div
                        className="bg-sky-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (subStatus.customerCount / subStatus.userLimit) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-amber-400 text-sm font-semibold">No Active Subscription. Purchase a plan below to unlock your dashboard.</div>
              )}
            </div>

            {/* Available Packages */}
            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar size={18} className="text-sky-400" />
                Available Packages & Plans
              </h2>
              <p className="text-xs text-slate-400">Select a subscription plan to activate or renew your distributor panel. Payments are processed securely via Razorpay.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {availablePlans
                  .filter((plan) => plan.price !== 0 && !(plan.name && plan.name.toLowerCase().includes('free')))
                  .map((plan) => {
                    const isCurrent = subStatus?.active && subStatus.subscription?.planId?._id === plan._id;
                    return (
                      <div key={plan._id} className={`glass-panel rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                        isCurrent ? 'border-sky-500 bg-sky-950/10' : 'border-marine-800'
                      }`}>
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-white text-base">{plan.name}</h3>
                            {isCurrent && (
                              <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 text-[9px] font-bold rounded-full uppercase tracking-wider">Current</span>
                            )}
                          </div>
                          <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider font-mono">{plan.duration}</span>
                          
                          <div className="my-3">
                            <span className="font-extrabold text-white text-2xl font-mono">Rs. {plan.price}</span>
                          </div>

                          <div className="border-t border-marine-850/50 pt-3 text-xs text-slate-400 space-y-1">
                            <div className="flex justify-between">
                              <span>Client Headcount:</span>
                              <span className="font-semibold text-white">{plan.userLimit} Customers</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSubscribePlan(plan)}
                          disabled={loading}
                          className="w-full mt-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isCurrent ? 'Renew / Extend Plan' : 'Purchase Plan'}
                        </button>
                      </div>
                    );
                  })}
                {availablePlans.filter((plan) => plan.price !== 0 && !(plan.name && plan.name.toLowerCase().includes('free'))).length === 0 && (
                  <div className="col-span-3 text-center py-6 text-slate-500 bg-marine-card/10 border border-marine-800 rounded-2xl">
                    No paid subscription plans configured by Admin.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <section className="space-y-6 animate-tab-transition">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
                  <Package className="text-sky-400" size={24} />
                  Product Catalog
                </h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Manage selling prices, descriptions, bottle packaging sizes, and product listings.</p>
              </div>
              <button
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setEditingProduct(null);
                  setProdName('');
                  setProdPrice('');
                  setProdPurchasePrice('');
                  setProdIsReturnable(true);
                  setProdSecurityDeposit('');
                  setProdDesc('');
                  setProdQty('');
                  setIsStockUpdateOnly(false);
                  setShowProductModal(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors self-start sm:self-center shadow-md shadow-sky-950/30"
              >
                <Plus size={16} />
                Add New Product
              </button>
            </div>

            <div className="glass-panel rounded-2xl border border-marine-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-marine-800 bg-marine-card text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-4">Product Name</th>
                      <th className="p-4">Container Type</th>
                      <th className="p-4">Size / Volume</th>
                      <th className="p-4">Purchase Cost</th>
                      <th className="p-4">Selling Price</th>
                      <th className="p-4">Unit Margin</th>
                      <th className="p-4">Catalog Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-marine-800/40 text-sm">
                    {products.map((prod) => (
                      <tr key={prod._id} className="hover:bg-marine-card/30 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-white">{prod.name}</div>
                          <div className="mt-0.5 max-w-xs truncate text-xs text-slate-400" title={prod.description}>
                            {prod.description || 'No description'}
                          </div>
                        </td>
                        <td className="p-4">
                          {prod.isReturnable !== false ? (
                            <div>
                              <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                Returnable Jar
                              </span>
                              {Number(prod.securityDeposit || 0) > 0 && (
                                <div className="text-[10px] text-amber-400 mt-0.5">Deposit: Rs. {prod.securityDeposit}</div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                              Consumable / Normal
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-300 font-medium">{prod.quantity || 'Standard'}</td>
                        <td className="p-4 text-amber-400 font-medium">Rs. {prod.purchasePrice || 0}</td>
                        <td className="p-4 font-bold text-emerald-400">Rs. {prod.price}</td>
                        <td className="p-4">
                          <span className="font-semibold text-sky-400">
                            Rs. {(Number(prod.price || 0) - Number(prod.purchasePrice || 0)).toFixed(0)}
                          </span>
                          <span className="ml-1 text-xs text-slate-400">
                            ({prod.price > 0 ? (((Number(prod.price) - Number(prod.purchasePrice || 0)) / Number(prod.price)) * 100).toFixed(0) : 0}%)
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            prod.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}>
                            {prod.isActive ? 'Active Catalog' : 'Hidden'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingProduct(prod);
                                setProdName(prod.name);
                                setProdPrice(prod.price);
                                setProdPurchasePrice(prod.purchasePrice !== undefined ? prod.purchasePrice : '');
                                setProdIsReturnable(prod.isReturnable !== false);
                                setProdSecurityDeposit(prod.securityDeposit !== undefined ? prod.securityDeposit : '');
                                setProdDesc(prod.description || '');
                                setProdQty(prod.quantity || '');
                                setProdStock(prod.stock || '');
                                setIsStockUpdateOnly(false);
                                setShowProductModal(true);
                              }}
                              className="rounded border border-sky-500/20 bg-sky-600/10 px-3 py-1 text-xs font-bold text-sky-400 transition-all hover:border-sky-500 hover:bg-sky-600 hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod._id)}
                              className="rounded border border-rose-500/20 bg-rose-600/10 px-3 py-1 text-xs font-bold text-rose-400 transition-all hover:border-rose-500 hover:bg-rose-600 hover:text-white"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-sm text-slate-500">
                          No products added yet. Click Add New Product to start.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <section className="space-y-6 animate-tab-transition">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
                  <Boxes className="text-sky-400" size={24} />
                  Stock &amp; Inventory Management
                </h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Live tracking of available stock, in-delivery units, and warehouse inventory health.</p>
              </div>
              <button
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setPurchaseProdId(products[0]?._id || '');
                  setPurchaseQty('');
                  setPurchaseSupplier('');
                  setPurchaseUnitCost('');
                  setPurchaseTotalAmount('');
                  setPurchaseInvoice('');
                  setPurchaseNotes('');
                  setPurchaseDate(new Date().toISOString().split('T')[0]);
                  setShowPurchaseModal(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors self-start sm:self-center shadow-md shadow-emerald-950/30"
              >
                <Plus size={16} />
                + Restock / Purchase Stock
              </button>
            </div>

            {/* Inventory KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-2xl border border-marine-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Available Stock</span>
                <span className="text-2xl font-extrabold text-white mt-1 block">
                  {products.reduce((sum, p) => sum + Number(p.stock || 0), 0)} <span className="text-xs font-normal text-slate-400">units</span>
                </span>
                <span className="text-[11px] text-emerald-400 mt-1 block">Ready for customer orders</span>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-marine-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">In Delivery</span>
                <span className="text-2xl font-extrabold text-amber-300 mt-1 block">
                  {products.reduce((sum, p) => sum + Number(p.pendingDeliveryStock || 0), 0)} <span className="text-xs font-normal text-slate-400">units</span>
                </span>
                <span className="text-[11px] text-amber-400/80 mt-1 block">On delivery trucks</span>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-marine-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Physical Jars</span>
                <span className="text-2xl font-extrabold text-sky-400 mt-1 block">
                  {products.reduce((sum, p) => sum + Number(p.stock || 0) + Number(p.pendingDeliveryStock || 0), 0)} <span className="text-xs font-normal text-slate-400">total</span>
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Available + In Transit</span>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-marine-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Low / Out of Stock</span>
                <span className="text-2xl font-extrabold text-rose-400 mt-1 block">
                  {products.filter((p) => Number(p.stock || 0) < 5).length} <span className="text-xs font-normal text-slate-400">products</span>
                </span>
                <span className="text-[11px] text-rose-400/80 mt-1 block">Needs restocking</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-marine-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-marine-800 bg-marine-card text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-4">Product</th>
                      <th className="p-4">Package / Size</th>
                      <th className="p-4">Available Stock</th>
                      <th className="p-4">Pending Delivery</th>
                      <th className="p-4">Total Physical</th>
                      <th className="p-4">Health Status</th>
                      <th className="p-4 text-right">Quick Restock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-marine-800/40 text-sm">
                    {products.map((prod) => {
                      const availStock = Number(prod.stock || 0);
                      const pendingStock = Number(prod.pendingDeliveryStock || 0);
                      const totalPhysical = availStock + pendingStock;
                      const stockStatus = getStockStatus(availStock);

                      return (
                        <tr key={prod._id} className="hover:bg-marine-card/30 transition-colors">
                          <td className="p-4 font-semibold text-white">{prod.name}</td>
                          <td className="p-4 text-slate-300">{prod.quantity || 'Standard'}</td>
                          <td className="p-4 font-bold text-emerald-400">{availStock} units</td>
                          <td className="p-4 font-bold text-amber-300">{pendingStock} units</td>
                          <td className="p-4 font-extrabold text-white">{totalPhysical} units</td>
                          <td className="p-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stockStatus.className}`}>
                              {stockStatus.label}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => {
                                setPurchaseProdId(prod._id);
                                setPurchaseQty('');
                                setPurchaseSupplier('');
                                setPurchaseUnitCost('');
                                setPurchaseTotalAmount('');
                                setPurchaseInvoice('');
                                setPurchaseNotes('');
                                setPurchaseDate(new Date().toISOString().split('T')[0]);
                                setShowPurchaseModal(true);
                              }}
                              className="rounded border border-emerald-500/20 bg-emerald-600/10 px-3 py-1.5 text-xs font-bold text-emerald-400 transition-all hover:border-emerald-500 hover:bg-emerald-600 hover:text-white cursor-pointer"
                            >
                              + Restock Stock
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-sm text-slate-500">
                          No products found. Please add products first.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* PURCHASES TAB */}
        {activeTab === 'purchases' && (
          <section className="space-y-6 animate-tab-transition">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
                  <ShoppingBag className="text-sky-400" size={24} />
                  Purchases &amp; Stock Inward
                </h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Record supplier purchase bills, inward shipment batches, and track procurement spending.</p>
              </div>
              <button
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setPurchaseProdId(products[0]?._id || '');
                  setPurchaseQty('');
                  setPurchaseSupplier('');
                  setPurchaseUnitCost('');
                  setPurchaseTotalAmount('');
                  setPurchaseInvoice('');
                  setPurchaseNotes('');
                  setPurchaseDate(new Date().toISOString().split('T')[0]);
                  setShowPurchaseModal(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors self-start sm:self-center shadow-md shadow-sky-950/30"
              >
                <Plus size={16} />
                + Record New Purchase
              </button>
            </div>

            {/* Purchases Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel p-4 rounded-2xl border border-marine-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Procurement Spend</span>
                <span className="text-2xl font-extrabold text-white mt-1 block">
                  Rs. {purchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Overall supplier billing</span>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-marine-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Jars Purchased</span>
                <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                  +{purchases.reduce((sum, p) => sum + Number(p.quantity || 0), 0)} <span className="text-xs font-normal text-slate-400">units</span>
                </span>
                <span className="text-[11px] text-emerald-400/80 mt-1 block">Inward restock volume</span>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-marine-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Purchase Bills</span>
                <span className="text-2xl font-extrabold text-sky-400 mt-1 block">
                  {purchases.length} <span className="text-xs font-normal text-slate-400">invoices</span>
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Logged purchase records</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-marine-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-marine-800 bg-marine-card text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-4">Date</th>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Product</th>
                      <th className="p-4">Qty Received</th>
                      <th className="p-4">Supplier / Source</th>
                      <th className="p-4">Unit Cost</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-marine-800/40 text-sm">
                    {purchases.map((pur) => (
                      <tr key={pur._id} className="hover:bg-marine-card/30 transition-colors">
                        <td className="p-4 text-slate-300 font-mono text-xs">
                          {pur.purchaseDate ? new Date(pur.purchaseDate).toLocaleDateString('en-IN') : 'N/A'}
                        </td>
                        <td className="p-4 font-mono font-semibold text-sky-400 text-xs">
                          {pur.invoiceNumber || '—'}
                        </td>
                        <td className="p-4 font-semibold text-white">{pur.productName}</td>
                        <td className="p-4 font-bold text-emerald-400">+{pur.quantity} units</td>
                        <td className="p-4 text-slate-300">{pur.supplierName || 'Self / Plant'}</td>
                        <td className="p-4 font-medium text-slate-300">Rs. {pur.unitCost || 0}</td>
                        <td className="p-4 font-bold text-white">Rs. {Number(pur.totalAmount || 0).toLocaleString('en-IN')}</td>
                        <td className="p-4 text-xs text-slate-400 max-w-[150px] truncate" title={pur.notes}>
                          {pur.notes || '—'}
                        </td>
                      </tr>
                    ))}
                    {purchases.length === 0 && (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-sm text-slate-500">
                          No purchases recorded yet. Click "+ Record New Purchase" to log inward stock.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* PROFIT & LOSS TAB */}
        {activeTab === 'profitLoss' && (
          <section className="space-y-6 animate-tab-transition">
            {/* Header & Timeframe selector */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
                  <TrendingUp className="text-emerald-400" size={24} />
                  Profit &amp; Loss Analytics
                </h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Financial calculations based on delivered orders, supplier purchase costs, and custom rates.
                </p>
              </div>

              {/* Timeframe controls */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-marine-card border border-marine-800 self-start md:self-center">
                {[
                  { key: 'today', label: 'Today' },
                  { key: 'week', label: '7 Days' },
                  { key: 'month', label: '30 Days' },
                  { key: 'year', label: 'Year' },
                  { key: 'all', label: 'All Time' }
                ].map((tf) => (
                  <button
                    key={tf.key}
                    onClick={() => {
                      setProfitLossTimeframe(tf.key);
                      fetchProfitLoss(tf.key);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      profitLossTimeframe === tf.key
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-marine-800/60'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
                <button
                  onClick={() => fetchProfitLoss(profitLossTimeframe)}
                  disabled={profitLossLoading}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-marine-800 transition-colors"
                  title="Refresh analytics"
                >
                  <RefreshCw size={14} className={profitLossLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <div className="glass-panel p-5 rounded-2xl border border-marine-800 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Sales Revenue</span>
                    <span className="text-2xl font-black text-white mt-2 block">
                      Rs. {Number(profitLossData?.summary?.totalRevenue || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <IndianRupee size={20} />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-marine-800/60 pt-2.5">
                  <span>Delivered Orders:</span>
                  <span className="font-bold text-slate-200">{profitLossData?.summary?.totalDeliveredOrders || 0} ({profitLossData?.summary?.totalUnitsSold || 0} units)</span>
                </div>
              </div>

              {/* COGS */}
              <div className="glass-panel p-5 rounded-2xl border border-marine-800 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Cost of Goods (COGS)</span>
                    <span className="text-2xl font-black text-amber-400 mt-2 block">
                      Rs. {Number(profitLossData?.summary?.totalCOGS || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Package size={20} />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-marine-800/60 pt-2.5">
                  <span>Wholesale Product Cost</span>
                  <span className="text-amber-300 font-medium">Delivered items</span>
                </div>
              </div>

              {/* Gross Profit */}
              <div className="glass-panel p-5 rounded-2xl border border-marine-800 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Gross Profit</span>
                    <span className={`text-2xl font-black mt-2 block ${
                      (profitLossData?.summary?.totalGrossProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      Rs. {Number(profitLossData?.summary?.totalGrossProfit || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${
                    (profitLossData?.summary?.totalGrossProfit || 0) >= 0
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    {(profitLossData?.summary?.totalGrossProfit || 0) >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-marine-800/60 pt-2.5">
                  <span>Revenue − COGS</span>
                  <span className={`font-bold ${(profitLossData?.summary?.totalGrossProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(profitLossData?.summary?.totalGrossProfit || 0) >= 0 ? 'Net Gain' : 'Net Deficit'}
                  </span>
                </div>
              </div>

              {/* Margin */}
              <div className="glass-panel p-5 rounded-2xl border border-marine-800 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Profit Margin</span>
                    <span className={`text-2xl font-black mt-2 block ${
                      (profitLossData?.summary?.profitMargin || 0) >= 20 ? 'text-emerald-400' : (profitLossData?.summary?.profitMargin || 0) > 0 ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {profitLossData?.summary?.profitMargin || 0}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                    <Percent size={20} />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-marine-800/60 pt-2.5">
                  <span>Total Purchases Logged:</span>
                  <span className="font-bold text-slate-300">Rs. {Number(profitLossData?.summary?.totalPurchasesExpense || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Product Profitability Breakdown */}
            <div className="glass-panel rounded-2xl border border-marine-800 overflow-hidden">
              <div className="p-5 border-b border-marine-800 bg-marine-card/50 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Package className="text-sky-400" size={18} />
                    Product Profitability Analysis
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Revenue, costs, and net margins broken down by product.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-marine-800 bg-marine-card text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-4">Product Name</th>
                      <th className="p-4">Units Sold</th>
                      <th className="p-4">Sales Revenue</th>
                      <th className="p-4">Total Cost (COGS)</th>
                      <th className="p-4">Gross Profit</th>
                      <th className="p-4 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-marine-800/40 text-sm">
                    {(profitLossData?.productBreakdown || []).map((prod) => (
                      <tr key={prod.productId || prod.name} className="hover:bg-marine-card/30 transition-colors">
                        <td className="p-4 font-semibold text-white">{prod.name}</td>
                        <td className="p-4 text-slate-300 font-medium">{prod.unitsSold} units</td>
                        <td className="p-4 font-bold text-white">Rs. {Number(prod.revenue).toLocaleString('en-IN')}</td>
                        <td className="p-4 text-amber-400 font-medium">Rs. {Number(prod.cogs).toLocaleString('en-IN')}</td>
                        <td className="p-4 font-bold">
                          <span className={prod.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            Rs. {Number(prod.profit).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                            prod.margin >= 25 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}>
                            {prod.margin}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!profitLossData?.productBreakdown || profitLossData.productBreakdown.length === 0) && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-sm text-slate-500">
                          No delivered orders in this timeframe. Profitability data will appear as orders are fulfilled.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer Profitability Breakdown */}
            <div className="glass-panel rounded-2xl border border-marine-800 overflow-hidden">
              <div className="p-5 border-b border-marine-800 bg-marine-card/50 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="text-teal-400" size={18} />
                    Customer Profitability Breakdown
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    See exactly how much profit each customer generates (factoring in custom negotiated rates).
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-marine-800 bg-marine-card text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-4">Customer</th>
                      <th className="p-4">Orders</th>
                      <th className="p-4">Units Bought</th>
                      <th className="p-4">Total Revenue</th>
                      <th className="p-4">Cost to Supply</th>
                      <th className="p-4">Net Profit</th>
                      <th className="p-4 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-marine-800/40 text-sm">
                    {(profitLossData?.customerBreakdown || []).map((cust) => (
                      <tr key={cust.customerId} className="hover:bg-marine-card/30 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-white">{cust.name}</div>
                          {cust.phone && <div className="text-xs text-slate-400">{cust.phone}</div>}
                        </td>
                        <td className="p-4 text-slate-300">{cust.ordersCount}</td>
                        <td className="p-4 text-slate-300 font-medium">{cust.unitsSold} units</td>
                        <td className="p-4 font-bold text-white">Rs. {Number(cust.revenue).toLocaleString('en-IN')}</td>
                        <td className="p-4 text-amber-400 font-medium">Rs. {Number(cust.cogs).toLocaleString('en-IN')}</td>
                        <td className="p-4 font-bold">
                          <span className={cust.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            Rs. {Number(cust.profit).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                            cust.margin >= 25 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}>
                            {cust.margin}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!profitLossData?.customerBreakdown || profitLossData.customerBreakdown.length === 0) && (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-sm text-slate-500">
                          No customer deliveries recorded in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Deliveries Profit Breakdown */}
            {profitLossData?.recentOrders?.length > 0 && (
              <div className="glass-panel rounded-2xl border border-marine-800 overflow-hidden">
                <div className="p-5 border-b border-marine-800 bg-marine-card/50">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <History className="text-sky-400" size={18} />
                    Recent Deliveries Margin Summary
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-marine-800 bg-marine-card text-xs font-bold uppercase tracking-wider text-slate-400">
                        <th className="p-4">Date</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Units</th>
                        <th className="p-4">Sale Amount</th>
                        <th className="p-4">Cost (COGS)</th>
                        <th className="p-4">Profit</th>
                        <th className="p-4 text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-marine-800/40 text-sm">
                      {profitLossData.recentOrders.map((ord) => (
                        <tr key={ord.orderId} className="hover:bg-marine-card/30 transition-colors">
                          <td className="p-4 text-slate-300 text-xs font-mono">
                            {ord.date ? new Date(ord.date).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                          <td className="p-4 font-semibold text-white">{ord.customerName}</td>
                          <td className="p-4 text-slate-300">{ord.units}</td>
                          <td className="p-4 font-bold text-white">Rs. {Number(ord.revenue).toLocaleString('en-IN')}</td>
                          <td className="p-4 text-amber-400 font-medium">Rs. {Number(ord.cogs).toLocaleString('en-IN')}</td>
                          <td className="p-4 font-bold text-emerald-400">Rs. {Number(ord.profit).toLocaleString('en-IN')}</td>
                          <td className="p-4 text-right">
                            <span className="font-semibold text-slate-300">{ord.margin}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === 'customers' && (
          <section className="space-y-6 animate-tab-transition">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Customer Tracker</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Manage linked customers, outstanding bottles, balances, and download statements.</p>
              </div>
              <button
                onClick={() => { setError(''); setSuccess(''); setShowCustomerModal(true); }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors self-start sm:self-center"
              >
                <Plus size={16} />
                Link Customer
              </button>
            </div>

            <div className="glass-panel rounded-2xl border border-marine-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-marine-card border-b border-marine-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Customer</th>
                      <th className="p-4">Delivery Address</th>
                      <th className="p-4 text-rose-400">Payments Left</th>
                      <th className="p-4 text-teal-400">Bottles Pending</th>
                      <th className="p-4 text-right">Statement</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-marine-800/40 text-sm">
                    {customers.map((cust) => (
                      <tr key={cust.relationId} className="hover:bg-marine-card/30 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-white">{cust.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{cust.phone}</div>
                          {cust.customPrices && cust.customPrices.length > 0 && (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Tag size={10} />
                              {cust.customPrices.length} custom rate{cust.customPrices.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-300 max-w-[200px] truncate" title={cust.address}>
                          {cust.address}
                        </td>
                        <td className="p-4 font-bold text-white">
                          {cust.balance > 0 ? (
                            <span className="text-rose-400">Rs. {cust.balance}</span>
                          ) : cust.balance < 0 ? (
                            <span className="text-emerald-400">Paid Adv. (Rs. {Math.abs(cust.balance)})</span>
                          ) : (
                            <span className="text-slate-500">Nil</span>
                          )}
                          {cust.securityDeposit > 0 && (
                            <div className="text-[11px] font-medium text-amber-300 mt-1 flex items-center gap-1.5">
                              <span>Deposit: Rs. {cust.securityDeposit}</span>
                              <button
                                onClick={() => handleOpenRefundModal(cust)}
                                className="underline hover:text-amber-200 cursor-pointer text-[10px]"
                                title="Refund security deposit"
                              >
                                Refund
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-bold">
                          {cust.bottlesOutstanding > 0 ? (
                            <div>
                              <span className="text-teal-400">{cust.bottlesOutstanding} Jars</span>
                              <div>
                                <button
                                  onClick={() => handleOpenDamageModal(cust)}
                                  className="inline-flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 mt-1 cursor-pointer font-semibold"
                                  title="Report broken or lost jar"
                                >
                                  <AlertTriangle size={10} />
                                  Report Damage
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500">All Returned</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewRecords(cust)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/10 hover:bg-sky-600 border border-sky-500/20 hover:border-sky-500 text-sky-400 hover:text-white text-xs font-semibold rounded cursor-pointer transition-all"
                            >
                              <Eye size={14} />
                              View Records
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(cust.customerId)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-marine-card hover:bg-marine-card/80 border border-marine-800 text-xs font-semibold rounded cursor-pointer transition-colors"
                            >
                              <FileText size={14} className="text-sky-400" />
                              Statement
                            </button>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenCustomPriceModal(cust)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600 border border-amber-500/20 hover:border-amber-500 text-amber-400 hover:text-white text-xs font-semibold rounded cursor-pointer transition-all"
                              title="Set special custom prices for this customer"
                            >
                              <Tag size={14} />
                              Rates
                            </button>
                            <button
                              onClick={() => handleOpenDamageModal(cust)}
                              disabled={!cust.bottlesOutstanding || cust.bottlesOutstanding <= 0}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-400 hover:text-white text-xs font-semibold rounded cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Report lost / broken jar with penalty"
                            >
                              <AlertTriangle size={14} />
                              Damage
                            </button>
                            <button
                              onClick={() => handleOpenCustomerPayment(cust)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white text-xs font-semibold rounded cursor-pointer transition-all"
                            >
                              <IndianRupee size={14} />
                              Pay
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-500">
                          No customer accounts connected to your supply.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* CUSTOMER RECORDS VIEW */}
        {activeTab === 'customerRecords' && selectedCustForRecords && (
          <section className="space-y-6 animate-tab-transition">
            {/* Back Button + Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setActiveTab('customers'); setSelectedCustForRecords(null); setError(''); setSuccess(''); }}
                  className="p-2 bg-marine-card hover:bg-marine-card/80 border border-marine-800 rounded-lg cursor-pointer transition-colors"
                  title="Back to Customer Tracker"
                >
                  <ArrowLeft size={18} className="text-slate-400" />
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white">{selectedCustForRecords.name}</h1>
                  <p className="text-xs md:text-sm text-slate-400 mt-0.5">{selectedCustForRecords.phone} {selectedCustForRecords.address ? `• ${selectedCustForRecords.address}` : ''}</p>
                </div>
              </div>
              <button
                onClick={() => handleDownloadPDF(selectedCustForRecords.customerId)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors self-start sm:self-center"
              >
                <Download size={16} />
                Download Statement
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-panel rounded-2xl p-5 border border-marine-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Due Amount</span>
                  <IndianRupee size={16} className="text-rose-400" />
                </div>
                <div className="text-2xl font-extrabold">
                  {selectedCustForRecords.balance > 0 ? (
                    <span className="text-rose-400">Rs. {selectedCustForRecords.balance}</span>
                  ) : selectedCustForRecords.balance < 0 ? (
                    <span className="text-emerald-400">Advance Rs. {Math.abs(selectedCustForRecords.balance)}</span>
                  ) : (
                    <span className="text-slate-500">Nil</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Outstanding payment balance</p>
              </div>
              <div className="glass-panel rounded-2xl p-5 border border-marine-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Bottles to Return</span>
                  <Truck size={16} className="text-teal-400" />
                </div>
                <div className="text-2xl font-extrabold">
                  {selectedCustForRecords.bottlesOutstanding > 0 ? (
                    <span className="text-teal-400">{selectedCustForRecords.bottlesOutstanding} Jars</span>
                  ) : (
                    <span className="text-slate-500">All Returned</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Empty bottles pending return</p>
              </div>
            </div>

            {/* Subtabs: All Orders / All Payments */}
            <div className="glass-panel rounded-2xl border border-marine-800 overflow-hidden">
              <div className="flex border-b border-marine-800">
                <button
                  onClick={() => setRecordsSubTab('orders')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
                    recordsSubTab === 'orders'
                      ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border-b-2 border-sky-500'
                      : 'text-slate-400 hover:text-sky-300 hover:bg-sky-500/10'
                  }`}
                >
                  <Package size={16} />
                  All Orders
                  <span className="text-[10px] bg-marine-card px-1.5 py-0.5 rounded-full font-mono">
                    {orders.filter(o => o.customerId?._id === selectedCustForRecords.customerId || o.customerId === selectedCustForRecords.customerId).length}
                  </span>
                </button>
                <button
                  onClick={() => setRecordsSubTab('payments')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
                    recordsSubTab === 'payments'
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-b-2 border-emerald-500'
                      : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                  }`}
                >
                  <IndianRupee size={16} />
                  All Payments
                  <span className="text-[10px] bg-marine-card px-1.5 py-0.5 rounded-full font-mono">
                    {payments.filter(p => p.customerId?._id === selectedCustForRecords.customerId || p.customerId === selectedCustForRecords.customerId).length}
                  </span>
                </button>
              </div>

              {/* Orders Sub-tab Content */}
              {recordsSubTab === 'orders' && (() => {
                const filteredOrders = orders.filter(o => o.customerId?._id === selectedCustForRecords.customerId || o.customerId === selectedCustForRecords.customerId);
                const totalPages = Math.ceil(filteredOrders.length / recordsPerPage) || 1;
                const currentData = filteredOrders.slice((recordsOrderPage - 1) * recordsPerPage, recordsOrderPage * recordsPerPage);

                return (
                  <div className="flex flex-col">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[650px]">
                        <thead>
                          <tr className="bg-marine-card/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <th className="p-3.5">Date / Slot</th>
                            <th className="p-3.5">Products (Qty)</th>
                            <th className="p-3.5">Bottles Log</th>
                            <th className="p-3.5">Cost (Rs)</th>
                            <th className="p-3.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-marine-800/40 text-sm">
                          {currentData.map((ord) => (
                            <tr key={ord._id} className="hover:bg-marine-card/20 transition-colors">
                              <td className="p-3.5 text-slate-400">
                                <div>{new Date(ord.createdAt).toLocaleDateString()}</div>
                                {ord.deliverySlot && (
                                  <div className="text-[10px] text-sky-400 font-mono mt-0.5">{ord.deliverySlot}</div>
                                )}
                              </td>
                              <td className="p-3.5 text-slate-200">
                                {ord.products.map((p) => {
                                  const requested = p.requestedQuantity ?? p.quantity;
                                  const delivered = p.deliveredQuantity ?? (ord.status === 'delivered' ? p.quantity : null);
                                  return `${p.name} (${delivered !== null && delivered !== requested ? `${delivered}/${requested}` : requested})`;
                                }).join(', ')}
                              </td>
                              <td className="p-3.5 text-xs font-mono text-slate-300">
                                Drop: {ord.bottlesDelivered} | Ret: {ord.bottlesReturned}
                              </td>
                              <td className="p-3.5 font-bold text-white">Rs. {ord.totalAmount}</td>
                              <td className="p-3.5">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  ord.status === 'delivered'
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                    : ord.status === 'cancelled'
                                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                }`}>
                                  {ord.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {filteredOrders.length === 0 && (
                            <tr>
                              <td colSpan="5" className="p-8 text-center text-slate-500">
                                No order records found for this customer.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 border-t border-marine-800 bg-marine-card/30">
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400">
                          Showing {filteredOrders.length > 0 ? (recordsOrderPage - 1) * recordsPerPage + 1 : 0} to {Math.min(recordsOrderPage * recordsPerPage, filteredOrders.length)} of {filteredOrders.length}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400 border-l border-marine-800 pl-4">
                          <span>Rows per page:</span>
                          <select 
                            value={recordsPerPage}
                            onChange={(e) => {
                              setRecordsPerPage(Number(e.target.value));
                              setRecordsOrderPage(1);
                              setRecordsPaymentPage(1);
                            }}
                            className="bg-marine-950 border border-marine-800 rounded p-1 text-xs focus:outline-none cursor-pointer"
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                          </select>
                        </div>
                      </div>
                      
                      {filteredOrders.length > recordsPerPage && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setRecordsOrderPage(prev => Math.max(1, prev - 1))}
                            disabled={recordsOrderPage === 1}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-300 bg-marine-950 border border-marine-800 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-marine-800 transition-colors"
                          >
                            Prev
                          </button>
                          <button
                            onClick={() => setRecordsOrderPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={recordsOrderPage === totalPages}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-300 bg-marine-950 border border-marine-800 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-marine-800 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Payments Sub-tab Content */}
              {recordsSubTab === 'payments' && (() => {
                const filteredPayments = payments.filter(p => p.customerId?._id === selectedCustForRecords.customerId || p.customerId === selectedCustForRecords.customerId);
                const totalPages = Math.ceil(filteredPayments.length / recordsPerPage) || 1;
                const currentData = filteredPayments.slice((recordsPaymentPage - 1) * recordsPerPage, recordsPaymentPage * recordsPerPage);

                return (
                  <div className="flex flex-col">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[550px]">
                        <thead>
                          <tr className="bg-marine-card/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <th className="p-3.5">Transaction Date</th>
                            <th className="p-3.5">Mode</th>
                            <th className="p-3.5">Reference Note</th>
                            <th className="p-3.5 text-emerald-400">Amount Received</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-marine-800/40 text-sm">
                          {currentData.map((p) => (
                            <tr key={p._id} className="hover:bg-marine-card/20 transition-colors">
                              <td className="p-3.5 text-slate-400">
                                {new Date(p.paymentDate).toLocaleDateString()}
                              </td>
                              <td className="p-3.5 text-slate-300 uppercase font-mono text-xs">
                                {p.paymentMethod}
                              </td>
                              <td className="p-3.5 text-slate-400 italic text-xs max-w-[200px] truncate" title={p.notes}>
                                {p.notes || '—'}
                              </td>
                              <td className="p-3.5 font-extrabold text-emerald-400">
                                + Rs. {p.amount}
                              </td>
                            </tr>
                          ))}
                          {filteredPayments.length === 0 && (
                            <tr>
                              <td colSpan="4" className="p-8 text-center text-slate-500">
                                No payment records found for this customer.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 border-t border-marine-800 bg-marine-card/30">
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400">
                          Showing {filteredPayments.length > 0 ? (recordsPaymentPage - 1) * recordsPerPage + 1 : 0} to {Math.min(recordsPaymentPage * recordsPerPage, filteredPayments.length)} of {filteredPayments.length}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400 border-l border-marine-800 pl-4">
                          <span>Rows per page:</span>
                          <select 
                            value={recordsPerPage}
                            onChange={(e) => {
                              setRecordsPerPage(Number(e.target.value));
                              setRecordsOrderPage(1);
                              setRecordsPaymentPage(1);
                            }}
                            className="bg-marine-950 border border-marine-800 rounded p-1 text-xs focus:outline-none cursor-pointer"
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                          </select>
                        </div>
                      </div>
                      
                      {filteredPayments.length > recordsPerPage && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setRecordsPaymentPage(prev => Math.max(1, prev - 1))}
                            disabled={recordsPaymentPage === 1}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-300 bg-marine-950 border border-marine-800 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-marine-800 transition-colors"
                          >
                            Prev
                          </button>
                          <button
                            onClick={() => setRecordsPaymentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={recordsPaymentPage === totalPages}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-300 bg-marine-950 border border-marine-800 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-marine-800 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

          </section>
        )}

        {activeTab === 'agents' && (
          <VendorAgentsPanel
            agents={agents}
            authFetch={authFetch}
            onAgentsUpdated={fetchData}
            canCreateAgents={Boolean(isSubActive)}
          />
        )}

        {/* DELIVERIES TAB */}
        {activeTab === 'deliveries' && (
          <section className="space-y-6 animate-tab-transition">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Delivery Ledger</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Log bottle drop-offs and empty returns. Showing records from the last 30 days.</p>
              </div>
              <button
                onClick={() => { setError(''); setSuccess(''); setShowOrderModal(true); }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors self-start sm:self-center"
              >
                <Plus size={16} />
                Log Delivery
              </button>
            </div>

            <div className="glass-panel rounded-2xl border border-marine-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-marine-card border-b border-marine-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Date / Slot</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Products (Qty)</th>
                      <th className="p-4">Bottles Log</th>
                      <th className="p-4">Cost (Rs)</th>
                      <th className="p-4">Delivery Agent</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-marine-800/40 text-sm">
                    {recentOrders.map((ord) => (
                      <tr key={ord._id} className="hover:bg-marine-card/30 transition-colors">
                        <td className="p-4 text-slate-400">
                          <div>{new Date(ord.createdAt).toLocaleDateString()}</div>
                          {ord.deliverySlot && (
                            <div className="text-[10px] text-sky-400 font-mono mt-0.5" title="Requested Delivery Slot">
                              {ord.deliverySlot}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-white">{ord.customerId?.name}</div>
                          <div className="text-[10px] text-slate-400">{ord.customerId?.phone}</div>
                          {ord.deliveryAddress && (
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-normal" title="Delivery Address">
                              <MapPin size={10} className="text-sky-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{ord.deliveryAddress}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-slate-200">
                          {ord.products.map((p) => {
                            const requested = p.requestedQuantity ?? p.quantity;
                            const delivered = p.deliveredQuantity ?? (ord.status === 'delivered' ? p.quantity : null);
                            return `${p.name} (${delivered !== null && delivered !== requested ? `${delivered}/${requested}` : requested})`;
                          }).join(', ')}
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-300">
                          Drop: {ord.bottlesDelivered} | Ret: {ord.bottlesReturned}
                        </td>
                        <td className="p-4 font-bold text-white">
                          Rs. {ord.totalAmount}
                        </td>
                        <td className="p-4">
                          {ord.status === 'pending' ? (
                            <select
                              value={ord.deliveryAgentId?._id || ord.deliveryAgentId || ''}
                              onChange={(event) => handleAssignAgent(ord._id, event.target.value)}
                              disabled={!isSubActive || agents.filter((agent) => agent.isActive).length === 0}
                              aria-label={`Assign delivery agent for order ${ord._id}`}
                              className="bg-marine-950 border border-marine-800 rounded px-2 py-1 text-xs text-white disabled:opacity-50"
                            >
                              <option value="">Unassigned</option>
                              {agents.filter((agent) => agent.isActive).map((agent) => (
                                <option key={agent._id} value={agent._id}>
                                  {agent.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-slate-300">
                              {ord.deliveryAgentId?.name || '—'}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.status === 'delivered'
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                              : ord.status === 'cancelled'
                              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                          }`}>
                            {ord.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {ord.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setProcessingOrder(ord);
                                  setReqDeliveredQty(ord.products.reduce((sum, p) => sum + (p.quantity || 0), 0));
                                  setReqReturnedQty(0);
                                  setReqPaymentMethod('due');
                                  setReqPaymentAmount(0);
                                  setShowProcessModal(true);
                                }}
                                disabled={!isSubActive}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer transition-colors disabled:opacity-40"
                                title="Fulfill & Deliver Order"
                              >
                                Deliver
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Cancel order #${ord._id.slice(-6)} for ${ord.customerId?.name || 'customer'}?`)) {
                                    handleProcessOrder(ord._id, 'cancelled');
                                  }
                                }}
                                disabled={!isSubActive}
                                className="px-2.5 py-1 bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600 text-rose-300 hover:text-white rounded text-xs font-semibold cursor-pointer transition-colors disabled:opacity-40"
                                title="Cancel Order"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : ord.status === 'delivered' ? (
                            <button
                              onClick={() => {
                                if (window.confirm(`Cancel delivered order #${ord._id.slice(-6)}? This will restock items and reverse customer balance.`)) {
                                  handleProcessOrder(ord._id, 'cancelled');
                                }
                              }}
                              disabled={!isSubActive}
                              className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-rose-400 hover:underline cursor-pointer disabled:opacity-40"
                              title="Cancel & Restock Order"
                            >
                              Cancel Order
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {recentOrders.length === 0 && (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-slate-500">
                          No delivery despatches logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <section className="space-y-6 animate-tab-transition">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Payment Collections</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Record collections and review payments from the last 30 days.</p>
              </div>
              <button
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setPayCustId('');
                  setPayAmount('');
                  setPayMethod('cash');
                  setPayNotes('');
                  setPayCashOnly(false);
                  setShowPaymentModal(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors self-start sm:self-center"
              >
                <Plus size={16} />
                Record Collection
              </button>
            </div>

            <div className="glass-panel rounded-2xl border border-marine-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-marine-card border-b border-marine-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Transaction Date</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Mode</th>
                      <th className="p-4">Reference Note</th>
                      <th className="p-4 text-emerald-400">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-marine-800/40 text-sm">
                    {recentPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-marine-card/30 transition-colors">
                        <td className="p-4 text-slate-400">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-white">{p.customerId?.name}</div>
                          <div className="text-[10px] text-slate-400">{p.customerId?.phone}</div>
                        </td>
                        <td className="p-4 text-slate-300 uppercase font-mono text-xs">
                          {p.paymentMethod}
                        </td>
                        <td className="p-4 text-slate-400 italic text-xs max-w-[200px] truncate" title={p.notes}>
                          {p.notes || '—'}
                        </td>
                        <td className="p-4 font-extrabold text-emerald-400">
                          + Rs. {p.amount}
                        </td>
                      </tr>
                    ))}
                    {recentPayments.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500">
                          No payment collections recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <section className="space-y-6 animate-tab-transition">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Console Settings</h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">Manage profile information and customer payment keys.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Profile Details Form */}
              <div className="glass-panel rounded-2xl p-6 border border-marine-800 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-marine-850 pb-3">
                  Vendor Profile Details
                </h2>
                <form onSubmit={handleUpdateSettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Vendor/Business Name</label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Registered Phone</label>
                      <input
                        type="tel"
                        required
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Email Address</label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Business Address</label>
                    <textarea
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      rows="3"
                      className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Change Password (leave blank to keep current)</label>
                    <input
                      type="password"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Razorpay section inside settings */}
                  <div className="border-t border-marine-850 pt-4 mt-6">
                    <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-3">Customer Online Payment Setup</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Enter your Razorpay Key ID and Secret to allow customers to pay their outstanding balances online directly to your bank account.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Razorpay Key ID</label>
                        <input
                          type="text"
                          value={vendorKeyId}
                          onChange={(e) => setVendorKeyId(e.target.value)}
                          placeholder="rzp_test_..."
                          className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Razorpay Key Secret</label>
                        <input
                          type="password"
                          value={vendorKeySecret}
                          onChange={(e) => setVendorKeySecret(e.target.value)}
                          placeholder={user?.hasRazorpaySecret ? 'Saved — enter a new secret to replace' : 'Key Secret'}
                          className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Saving Settings...' : 'Save All Settings'}
                  </button>
                </form>
              </div>

              {/* Right Column: Delivery Slots & Setup Instructions */}
              <div className="space-y-8">
                {/* Delivery Slots Configuration */}
                <div className="glass-panel rounded-2xl p-6 border border-marine-800 space-y-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-marine-850 pb-3">
                    <Truck size={18} className="text-sky-400" />
                    Delivery Slots Setup
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Set up your business's active delivery windows. Your clients will choose from these slots when filing a delivery request.
                  </p>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {profileSlots.map((slot, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-marine-950/60 border border-marine-850 rounded-xl hover:border-sky-500/20 transition-all"
                      >
                        <span className="text-sm font-semibold text-slate-200">{slot}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileSlots(profileSlots.filter((_, i) => i !== index));
                          }}
                          className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded transition-all cursor-pointer animate-all"
                          title="Delete slot"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {profileSlots.length === 0 && (
                      <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-marine-800 rounded-xl">
                        No delivery slots set. Default intervals will apply if left blank.
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={newSlotText}
                      onChange={(e) => setNewSlotText(e.target.value)}
                      placeholder="e.g. Early Morning (6 AM - 8 AM)"
                      className="flex-1 bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newSlotText.trim()) return;
                        if (profileSlots.includes(newSlotText.trim())) {
                          alert('This delivery slot already exists.');
                          return;
                        }
                        setProfileSlots([...profileSlots, newSlotText.trim()]);
                        setNewSlotText('');
                      }}
                      className="px-4 py-2 bg-sky-600/15 hover:bg-sky-600 border border-sky-500/30 hover:border-sky-500 text-sky-400 hover:text-white rounded-lg text-sm font-bold transition-all cursor-pointer"
                    >
                      Add Slot
                    </button>
                  </div>
                  <div className="border-t border-marine-850 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                    <p className="text-[10px] text-slate-500 italic">
                      * Saves all console profile and delivery settings.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleUpdateSettings()}
                      disabled={loading}
                      className="w-full sm:w-auto px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Saving Slots...' : 'Save Time Slots'}
                    </button>
                  </div>
                </div>

                {/* Guide/Info Panel */}
                <div className="glass-panel rounded-2xl p-6 border border-marine-800 space-y-4 text-xs text-slate-400">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-marine-850 pb-3">
                    Setup Instructions
                  </h2>
                  <div className="space-y-3 leading-relaxed">
                    <span className="font-bold text-white block mb-1">Configuring Razorpay for Collections:</span>
                    <p>1. Log in to your <a href="https://dashboard.razorpay.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Razorpay Dashboard</a>.</p>
                    <p>2. Go to **Settings** &gt; **API Keys** &gt; **Generate Key**.</p>
                    <p>3. Copy the **Key ID** and **Key Secret** generated and paste them in the fields on the left.</p>
                    <p>4. Once saved, customers connected to your distributor account will see a "Pay Online" option on their portal when they have a pending balance due.</p>
                    <p className="p-3 bg-marine-card/50 border border-marine-850 rounded text-slate-400">
                      <span className="font-bold text-amber-400 block mb-1">Note:</span>
                      Payments made by customers go directly to your configured Razorpay merchant account. Razorpay settlement cycle will apply.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* MODAL: ADD / EDIT PRODUCT */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[calc(100dvh_-_2rem)] overflow-y-auto glass-panel-glow rounded-2xl p-6 border border-sky-500/30">
            <h2 className="text-xl font-bold text-white mb-4">
              {isStockUpdateOnly ? `Add Stock: ${prodName}` : (editingProduct ? 'Edit Product' : 'Add Product')}
            </h2>
            {error && (
              <div className="p-3 mb-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleSaveProduct} className="space-y-4">
              {!isStockUpdateOnly && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Product Name</label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="e.g. 20 Litre Mineral Jar"
                      className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Selling Price (Rs)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Purchase Cost (Rs)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={prodPurchasePrice}
                        onChange={(e) => setProdPurchasePrice(e.target.value)}
                        placeholder="e.g. 30"
                        className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Size (e.g. 20L)</label>
                      <input
                        type="text"
                        value={prodQty}
                        onChange={(e) => setProdQty(e.target.value)}
                        placeholder="e.g. 20L"
                        className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                  {prodPrice !== '' && prodPurchasePrice !== '' && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-sky-950/40 border border-sky-800/40 text-xs text-sky-300">
                      <span>Standard Margin per unit:</span>
                      <span className="font-bold text-emerald-400">
                        Rs. {(Number(prodPrice) - Number(prodPurchasePrice)).toFixed(2)} ({Number(prodPrice) > 0 ? (((Number(prodPrice) - Number(prodPurchasePrice)) / Number(prodPrice)) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  )}
                  <div className="rounded-lg border border-marine-800 bg-marine-950/60 p-3 space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prodIsReturnable}
                        onChange={(e) => setProdIsReturnable(e.target.checked)}
                        className="w-4 h-4 rounded text-sky-600 bg-marine-900 border-marine-700 focus:ring-0 focus:outline-none"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">Returnable Jar Container</span>
                        <span className="text-[11px] text-slate-400 block">
                          Tracks empty jar collections and return balances. Uncheck for disposable/consumable bottles.
                        </span>
                      </div>
                    </label>

                    {prodIsReturnable && (
                      <div className="pt-2 border-t border-marine-800/80">
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                          Refundable Security Deposit per Jar (Rs)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={prodSecurityDeposit}
                          onChange={(e) => setProdSecurityDeposit(e.target.value)}
                          placeholder="e.g. 150 (charged only on customer's first order)"
                          className="w-full bg-marine-900 border border-marine-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-sky-500"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Only charged on the customer's first returnable order with your business.
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border border-marine-800 bg-marine-950/60 p-3">
                    <span className="block text-xs font-semibold uppercase text-slate-400">Availability Status</span>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStockStatus(editingProduct?.stock).className}`}>
                      {getStockStatus(editingProduct?.stock).label}
                    </span>
                    <p className="mt-2 text-xs text-slate-500">Updates automatically based on available stock.</p>
                  </div>
                </>
              )}
              {isStockUpdateOnly && (
                <div>
                  <p className="mb-4 rounded-lg border border-marine-800 bg-marine-950/60 p-3 text-sm text-slate-300">
                    Current stock: <span className="font-bold text-white">{Number(editingProduct?.stock || 0)} units</span>
                  </p>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Stock to add</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    placeholder="Number of units to add"
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}
              {!isStockUpdateOnly && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Description / Details</label>
                  <textarea
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Details about water source, container, etc."
                    rows="3"
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setShowProductModal(false);
                    setEditingProduct(null);
                    setProdName('');
                    setProdPrice('');
                    setProdDesc('');
                    setProdQty('');
                    setProdStock('');
                    setIsStockUpdateOnly(false);
                  }}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg cursor-pointer"
                >
                  {isStockUpdateOnly ? 'Add Stock' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PURCHASE / STOCK INWARD */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg max-h-[calc(100dvh_-_2rem)] overflow-y-auto glass-panel-glow rounded-2xl p-6 border border-emerald-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">Record Stock Purchase</h2>
                <p className="text-xs text-slate-400 mt-0.5">Inward stock will automatically be added to product available inventory.</p>
              </div>
            </div>

            {error && (
              <div className="p-3 mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleRecordPurchase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Select Product to Restock *</label>
                <select
                  required
                  value={purchaseProdId}
                  onChange={(e) => setPurchaseProdId(e.target.value)}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Choose a Product --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.quantity || 'Standard'}) — Current stock: {p.stock || 0}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Quantity (Units) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={purchaseQty}
                    onChange={(e) => {
                      const q = e.target.value;
                      setPurchaseQty(q);
                      if (purchaseUnitCost && Number(purchaseUnitCost) > 0) {
                        setPurchaseTotalAmount(String(Number(purchaseUnitCost) * Number(q)));
                      }
                    }}
                    placeholder="e.g. 50"
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Unit Cost (Rs) [Optional]</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchaseUnitCost}
                    onChange={(e) => {
                      const cost = e.target.value;
                      setPurchaseUnitCost(cost);
                      if (purchaseQty && Number(purchaseQty) > 0) {
                        setPurchaseTotalAmount(String(Number(cost) * Number(purchaseQty)));
                      }
                    }}
                    placeholder="e.g. 40"
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Total Amount (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchaseTotalAmount}
                    onChange={(e) => setPurchaseTotalAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Supplier / Factory Name</label>
                  <input
                    type="text"
                    value={purchaseSupplier}
                    onChange={(e) => setPurchaseSupplier(e.target.value)}
                    placeholder="e.g. Himalayan Springs Plant"
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Invoice / Bill Number</label>
                  <input
                    type="text"
                    value={purchaseInvoice}
                    onChange={(e) => setPurchaseInvoice(e.target.value)}
                    placeholder="e.g. INV-2026-089"
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Notes / Truck Details</label>
                <input
                  type="text"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="e.g. Received via Vehicle WB-04-1234, 50 jars intact"
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setShowPurchaseModal(false);
                    setPurchaseProdId('');
                    setPurchaseQty('');
                    setPurchaseSupplier('');
                    setPurchaseUnitCost('');
                    setPurchaseTotalAmount('');
                    setPurchaseInvoice('');
                    setPurchaseNotes('');
                    setPurchaseDate('');
                  }}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg cursor-pointer transition-colors shadow-md shadow-emerald-950/30"
                >
                  Confirm &amp; Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LINK CUSTOMER */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[calc(100dvh_-_2rem)] overflow-y-auto glass-panel-glow rounded-2xl p-6 border border-sky-500/30">
            <h2 className="text-xl font-bold text-white mb-2">Link Customer</h2>
            <p className="text-xs text-slate-400 mb-4">Enter a user phone number to connect them to your water supply channel.</p>
            {error && (
              <div className="p-3 mb-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {showNewCustFields && (
                <div className="space-y-4 border-t border-marine-850 pt-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 text-sky-400 font-mono">Customer Name</label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-marine-950 border border-sky-850 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 text-sky-400 font-mono">Delivery Address (Optional)</label>
                    <input
                      type="text"
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      placeholder="Door No, Street Name, City"
                      className="w-full bg-marine-950 border border-sky-850 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setShowCustomerModal(false);
                    setShowNewCustFields(false);
                    setCustPhone('');
                    setCustName('');
                    setCustAddress('');
                  }}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg cursor-pointer"
                >
                  {showNewCustFields ? 'Register & Link' : 'Validate & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG DELIVERY */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[calc(100dvh_-_2rem)] overflow-y-auto glass-panel-glow rounded-2xl p-6 border border-sky-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Log Delivery Dispatch</h2>
            {error && (
              <div className="p-3 mb-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleAddOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Select Customer</label>
                <select
                  required
                  value={selectedCustId}
                  onChange={(e) => setSelectedCustId(e.target.value)}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.relationId} value={c.customerId}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Select Product</label>
                <select
                  required
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Rs. {p.price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={orderQty}
                    onChange={(e) => {
                      setOrderQty(e.target.value);
                      setBottlesDelivered(e.target.value);
                    }}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Delivered</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={bottlesDelivered}
                    onChange={(e) => setBottlesDelivered(e.target.value)}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Returned</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={bottlesReturned}
                    onChange={(e) => setBottlesReturned(e.target.value)}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setError(''); setSuccess(''); setShowOrderModal(false); }}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg cursor-pointer"
                >
                  Log Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COLLECT PAYMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[calc(100dvh_-_2rem)] overflow-y-auto glass-panel-glow rounded-2xl p-6 border border-sky-500/30">
            <h2 className="text-xl font-bold text-white mb-4">
              {payCashOnly ? 'Record Cash Payment' : 'Record Payment'}
            </h2>
            {error && (
              <div className="p-3 mb-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  {payCashOnly ? 'Customer' : 'Select Customer'}
                </label>
                {payCashOnly ? (
                  <div className="w-full rounded-lg border border-marine-800 bg-marine-950 p-2.5 text-sm text-white">
                    {customers.find((customer) => customer.customerId === payCustId)?.name || 'Customer'}
                  </div>
                ) : (
                  <select
                    required
                    value={payCustId}
                    onChange={(e) => setPayCustId(e.target.value)}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.relationId} value={c.customerId}>
                        {c.name} (Phone: {c.phone} | Bal: Rs. {c.balance})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className={`grid gap-4 ${payCashOnly ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                    {payCashOnly ? 'Cash amount (Rs)' : 'Amount (Rs)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                {!payCashOnly && <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Mode</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="cash">Cash Mode</option>
                    <option value="online">Online Mode (UPI)</option>
                    <option value="other">Other Mode</option>
                  </select>
                </div>}
                {payCashOnly && (
                  <p className="text-xs font-semibold text-emerald-400">Payment method: Cash</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Notes / Ref Number</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Txn ID, Month bill, etc."
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setPayCashOnly(false);
                    setShowPaymentModal(false);
                  }}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg cursor-pointer"
                >
                  {payCashOnly ? 'Record Cash Payment' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPLETE DELIVERY REQUEST */}
      {showProcessReqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[calc(100dvh_-_2rem)] overflow-y-auto glass-panel-glow rounded-2xl p-6 border border-sky-500/30 animate-scale-up">
            <h2 className="text-xl font-bold text-white mb-2">Complete Delivery Request</h2>
            <p className="text-xs text-slate-400 mb-4">
              Review and record the delivery details for <strong>{processingOrder?.customerId?.name}</strong>.
            </p>
            {reqError && (
              <div className="p-3 mb-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {reqError}
              </div>
            )}
            <form onSubmit={handleConfirmProcessReq} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Number of bottles delivered
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={reqBottlesDelivered}
                  onChange={(e) => {
                    setReqBottlesDelivered(e.target.value);
                    if (Number(e.target.value) < reqTotalQty) {
                      setReqError(`Delivered bottles cannot be less than the product quantity (${reqTotalQty}).`);
                    } else {
                      setReqError('');
                    }
                  }}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Product quantity requested: {reqTotalQty} bottle{reqTotalQty !== 1 ? 's' : ''}.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Number of empty bottles returned
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={reqBottlesReturned}
                  onChange={(e) => setReqBottlesReturned(e.target.value)}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Payment Status
                </label>
                <select
                  value={reqPaymentMethod}
                  onChange={(e) => setReqPaymentMethod(e.target.value)}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="due">Due (Pay Later)</option>
                  <option value="cash">Cash (Paid Instantly)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {reqPaymentMethod === 'due'
                    ? `Rs. ${processingOrder?.totalAmount || 0} will be added to customer balance.`
                    : `A cash payment will be recorded immediately.`}
                </span>
              </div>

              {reqPaymentMethod === 'cash' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                    Cash Amount Collected (Rs)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={reqPaymentAmount}
                    onChange={(e) => setReqPaymentAmount(e.target.value)}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Prefilled with total amount of Rs. {processingOrder?.totalAmount || 0}. Adjust if partial payment was made.
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReqError('');
                    setShowProcessReqModal(false);
                    setProcessingOrder(null);
                  }}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg cursor-pointer"
                >
                  Confirm Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOM CUSTOMER PRICING */}
      {showCustomPriceModal && selectedCustomerForPricing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg max-h-[calc(100dvh_-_2rem)] overflow-y-auto glass-panel-glow rounded-2xl p-6 border border-amber-500/30 animate-scale-up">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Tag className="text-amber-400" size={20} />
                  Special Pricing: {selectedCustomerForPricing.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Phone: <span className="text-slate-300 font-mono">{selectedCustomerForPricing.phone}</span>
                </p>
              </div>
              <button
                onClick={() => { setShowCustomPriceModal(false); setSelectedCustomerForPricing(null); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-marine-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
              Set custom selling prices for this specific customer. Any item left blank or empty will automatically use your standard catalog price.
            </div>

            {error && (
              <div className="p-3 mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveCustomPrices} className="space-y-4">
              <div className="divide-y divide-marine-800/60 border border-marine-800 rounded-xl overflow-hidden bg-marine-950/60">
                {products.map((prod) => {
                  const currentCustomVal = customerCustomPrices[prod._id] !== undefined ? customerCustomPrices[prod._id] : '';
                  const hasCustom = currentCustomVal !== '' && !isNaN(Number(currentCustomVal));
                  const effectiveSellPrice = hasCustom ? Number(currentCustomVal) : Number(prod.price || 0);
                  const purchaseCost = Number(prod.purchasePrice || 0);
                  const marginPerUnit = effectiveSellPrice - purchaseCost;
                  const marginPercent = effectiveSellPrice > 0 ? ((marginPerUnit / effectiveSellPrice) * 100).toFixed(0) : 0;

                  return (
                    <div key={prod._id} className="p-3.5 space-y-2 hover:bg-marine-900/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-white">{prod.name}</div>
                          <div className="text-xs text-slate-400">
                            Std. Price: <span className="text-slate-200 font-semibold">Rs. {prod.price}</span>
                            {purchaseCost > 0 && (
                              <span className="ml-2 text-slate-400">| Cost: <span className="text-amber-300">Rs. {purchaseCost}</span></span>
                            )}
                          </div>
                        </div>
                        <div className="w-32">
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Custom Price (Rs)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder={`Std: ${prod.price}`}
                            value={currentCustomVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomerCustomPrices((prev) => ({
                                ...prev,
                                [prod._id]: val
                              }));
                            }}
                            className={`w-full bg-marine-900 border rounded-lg p-2 text-sm text-white focus:outline-none ${
                              hasCustom ? 'border-amber-500/60 bg-amber-950/20 text-amber-200' : 'border-marine-800 focus:border-sky-500'
                            }`}
                          />
                        </div>
                      </div>

                      {hasCustom && (
                        <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded bg-marine-900/50 border border-marine-800/50">
                          <span className="text-amber-400 font-medium">Custom Rate Active: Rs. {effectiveSellPrice}</span>
                          <span className={`font-semibold ${marginPerUnit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            Profit: Rs. {marginPerUnit.toFixed(1)} ({marginPercent}%)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {products.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No products found. Add products in the Product Catalog first.
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomPriceModal(false);
                    setSelectedCustomerForPricing(null);
                  }}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={products.length === 0}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm rounded-lg cursor-pointer transition-colors shadow-md shadow-amber-950/30 disabled:opacity-50"
                >
                  Save Custom Rates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REPORT DAMAGED / LOST JAR */}
      {showDamageJarModal && selectedCustForDamage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[calc(100dvh_-_2rem)] overflow-y-auto glass-panel-glow rounded-2xl p-6 border border-rose-500/30 animate-scale-up">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="text-rose-400" size={20} />
                  Report Broken / Lost Jar
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customer: <span className="text-white font-semibold">{selectedCustForDamage.name}</span> ({selectedCustForDamage.phone})
                </p>
              </div>
              <button
                onClick={() => { setShowDamageJarModal(false); setSelectedCustForDamage(null); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-marine-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 leading-relaxed">
              Writing off a broken or lost jar reduces the customer's pending jars. You can add a penalty / replacement fee to be charged to the customer.
            </div>

            {error && (
              <div className="p-3 mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitDamage} className="space-y-4">
              <div className="p-3 rounded-lg bg-marine-950/60 border border-marine-800 text-xs flex justify-between items-center">
                <span className="text-slate-400">Total Pending Jars with Customer:</span>
                <span className="font-bold text-teal-400 text-sm">{selectedCustForDamage.bottlesOutstanding} Jars</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Number of Jars Damaged / Lost</label>
                <input
                  type="number"
                  min="1"
                  max={selectedCustForDamage.bottlesOutstanding}
                  required
                  value={damageJarCount}
                  onChange={(e) => setDamageJarCount(e.target.value)}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Damage / Penalty Fee to Charge (Rs)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={damagePenaltyAmount}
                  onChange={(e) => setDamagePenaltyAmount(e.target.value)}
                  placeholder="e.g. 150 (enter 0 to waive fee)"
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  This penalty amount will be added to the customer's unpaid balance.
                </span>
              </div>

              {Number(selectedCustForDamage.securityDeposit || 0) > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={damageDeductDeposit}
                      onChange={(e) => setDamageDeductDeposit(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 bg-marine-900 border-marine-700"
                    />
                    <span className="text-xs text-amber-200">
                      Deduct penalty from held Security Deposit (Rs. {selectedCustForDamage.securityDeposit}) instead of adding to bill
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Reason / Note</label>
                <input
                  type="text"
                  value={damageNotes}
                  onChange={(e) => setDamageNotes(e.target.value)}
                  placeholder="e.g. Broken jar base, damaged on site"
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDamageJarModal(false);
                    setSelectedCustForDamage(null);
                  }}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm rounded-lg cursor-pointer transition-colors shadow-md shadow-rose-950/30"
                >
                  Write Off &amp; Apply Penalty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REFUND SECURITY DEPOSIT */}
      {showRefundDepositModal && selectedCustForDamage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[calc(100dvh_-_2rem)] overflow-y-auto glass-panel-glow rounded-2xl p-6 border border-sky-500/30 animate-scale-up">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <IndianRupee className="text-sky-400" size={20} />
                  Refund Security Deposit
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customer: <span className="text-white font-semibold">{selectedCustForDamage.name}</span>
                </p>
              </div>
              <button
                onClick={() => { setShowRefundDepositModal(false); setSelectedCustForDamage(null); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-marine-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 mb-4 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 leading-relaxed">
              Process refund for the customer's returnable jar deposit when they return containers or close their account.
            </div>

            {error && (
              <div className="p-3 mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitRefund} className="space-y-4">
              <div className="p-3 rounded-lg bg-marine-950/60 border border-marine-800 text-xs flex justify-between items-center">
                <span className="text-slate-400">Total Deposit Held:</span>
                <span className="font-bold text-amber-400 text-sm">Rs. {selectedCustForDamage.securityDeposit || 0}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Refund Amount (Rs)</label>
                <input
                  type="number"
                  min="1"
                  max={selectedCustForDamage.securityDeposit || 0}
                  step="any"
                  required
                  value={refundDepositAmount}
                  onChange={(e) => setRefundDepositAmount(e.target.value)}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {Number(selectedCustForDamage.balance || 0) > 0 && (
                <div className="p-3 rounded-lg bg-marine-950/60 border border-marine-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={refundAdjustBalance}
                      onChange={(e) => setRefundAdjustBalance(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 bg-marine-900 border-marine-700"
                    />
                    <span className="text-xs text-slate-300">
                      Adjust refund against customer's pending unpaid bill of Rs. {selectedCustForDamage.balance}
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Note / Transaction Details</label>
                <input
                  type="text"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="e.g. Returned all jars, refunded via Cash / UPI"
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRefundDepositModal(false);
                    setSelectedCustForDamage(null);
                  }}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg cursor-pointer transition-colors shadow-md shadow-sky-950/30"
                >
                  Process Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default VendorDashboard;
