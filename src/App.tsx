import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Server, 
  Activity, 
  Terminal, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Search,
  Settings,
  ChevronRight,
  Plus,
  RefreshCw,
  ShieldCheck,
  Cpu,
  Database,
  Wifi
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { auth, db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { Device, Metric, Log, User, AuthResponse } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Card = ({ children, className, title, icon: Icon }: any) => (
  <div className={cn("bg-white border border-slate-200 rounded-2xl p-6 shadow-sm", className)}>
    {title && (
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-indigo-600" />}
          {title}
        </h3>
      </div>
    )}
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: any) => {
  const variants: any = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-rose-100 text-rose-700",
    info: "bg-indigo-100 text-indigo-700",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", variants[variant])}>
      {children}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }: any) => {
  useEffect(() => {
    if (isOpen) {
      console.log(`Modal "${title}" opened`);
    }
  }, [isOpen, title]);

  console.log(`Modal "${title}" render:`, { isOpen });

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">{title}</h3>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [devices, setDevices] = useState<Device[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Exchange Firebase user for a backend JWT
        try {
          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: u.uid, email: u.email, displayName: u.displayName })
          });
          const data = await res.json();
          setSessionToken(data.token);
        } catch (err) {
          console.error("Failed to get session token:", err);
          setSessionToken('demo-token'); // Fallback
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qDevices = query(collection(db, 'devices'), orderBy('name'));
    const unsubDevices = onSnapshot(qDevices, (snapshot) => {
      setDevices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Device)));
    });

    const qLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log)));
    });

    return () => {
      unsubDevices();
      unsubLogs();
    };
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const handleLogout = () => signOut(auth);

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium">Initializing NOCC...</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl border border-slate-200 text-center"
      >
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-200">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">NOCC Access</h1>
        <p className="text-slate-500 mb-10">Network Operations Control Center</p>
        <button 
          onClick={handleLogin}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-3"
        >
          <img src="https://www.gstatic.com/firebase/anonymous-scan.png" className="w-6 h-6 invert" alt="Google" referrerPolicy="no-referrer" />
          Sign in with Enterprise Account
        </button>
        <p className="mt-8 text-xs text-slate-400">Authorized Personnel Only. All access is logged.</p>
      </motion.div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-slate-200 flex flex-col z-20"
      >
        <div className="p-6 flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg shadow-indigo-100">
            <Activity className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight">NOCC</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'devices', label: 'Devices', icon: Server },
            { id: 'monitoring', label: 'Monitoring', icon: Activity },
            { id: 'automation', label: 'Automation', icon: Terminal },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-4 p-3 rounded-xl transition-all group",
                activeTab === item.id 
                  ? "bg-indigo-50 text-indigo-600" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-3 text-slate-500 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="text-lg font-bold capitalize">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            <div className="relative flex-1 md:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search network..." 
                className="pl-10 pr-10 py-2 bg-slate-100 border-none rounded-xl text-sm w-full md:w-64 focus:ring-2 focus:ring-indigo-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {logs.filter(l => l.severity === 'error' || l.severity === 'critical').length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setIsNotificationsOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-40 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-sm">Notifications</h3>
                        <Badge variant="info">{logs.length}</Badge>
                      </div>
                      <div className="max-h-96 overflow-y-auto p-2">
                        {logs.length > 0 ? (
                          [...logs]
                            .sort((a, b) => {
                              const priority: any = { critical: 0, error: 1, warning: 2, info: 3 };
                              return priority[a.severity] - priority[b.severity];
                            })
                            .slice(0, 10)
                            .map((log, i) => (
                              <div key={i} className="p-3 hover:bg-slate-50 rounded-xl transition-colors flex gap-3 items-start">
                                <div className={cn(
                                  "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                                  log.severity === 'critical' || log.severity === 'error' ? 'bg-rose-500' : 
                                  log.severity === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                                )} />
                                <div>
                                  <p className="text-xs font-medium text-slate-900 leading-relaxed">{log.message}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant={
                                      log.severity === 'critical' || log.severity === 'error' ? 'error' : 
                                      log.severity === 'warning' ? 'warning' : 'success'
                                    }>
                                      {log.severity}
                                    </Badge>
                                    <p className="text-[10px] text-slate-400">
                                      {new Date(log.timestamp).toLocaleTimeString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            No new notifications
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t border-slate-100 text-center">
                        <button 
                          onClick={() => {
                            setActiveTab('dashboard');
                            setIsNotificationsOpen(false);
                          }}
                          className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700"
                        >
                          View All Logs
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{user.displayName}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Network Admin</p>
              </div>
              <img src={user.photoURL || ''} className="w-10 h-10 rounded-xl border border-slate-200" alt="User" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <DashboardView 
                  devices={devices.filter(d => 
                    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    d.ip.includes(searchQuery)
                  )} 
                  logs={logs.filter(l => 
                    l.message.toLowerCase().includes(searchQuery.toLowerCase())
                  )} 
                />
              )}
              {activeTab === 'devices' && (
                <DevicesView 
                  devices={devices.filter(d => 
                    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    d.ip.includes(searchQuery)
                  )} 
                  user={user} 
                />
              )}
              {activeTab === 'monitoring' && (
                <MonitoringView 
                  devices={devices.filter(d => 
                    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    d.ip.includes(searchQuery)
                  )} 
                  token={sessionToken} 
                />
              )}
              {activeTab === 'automation' && (
                <AutomationView 
                  devices={devices.filter(d => 
                    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    d.ip.includes(searchQuery)
                  )} 
                  token={sessionToken} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- Views ---

function DashboardView({ devices, logs }: { devices: Device[], logs: Log[] }) {
  const stats = [
    { label: 'Total Devices', value: devices.length, icon: Server, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Online', value: devices.filter(d => d.status === 'online').length, icon: Wifi, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'CPU Usage', value: '42%', icon: Cpu, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Storage', value: '1.2 TB', icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const chartData = [
    { name: '00:00', traffic: 400, errors: 24 },
    { name: '04:00', traffic: 300, errors: 13 },
    { name: '08:00', traffic: 900, errors: 98 },
    { name: '12:00', traffic: 1200, errors: 39 },
    { name: '16:00', traffic: 1500, errors: 48 },
    { name: '20:00', traffic: 1100, errors: 38 },
    { name: '23:59', traffic: 600, errors: 43 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="flex items-center gap-6">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card title="Traffic Overview" className="lg:col-span-2 min-h-[400px]">
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="traffic" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Recent Logs" className="h-[400px] flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                  log.severity === 'critical' || log.severity === 'error' ? 'bg-rose-500' : 
                  log.severity === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                )} />
                <div>
                  <p className="text-xs font-medium text-slate-900 line-clamp-2">{log.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()} • {log.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DevicesView({ devices, user }: { devices: Device[], user: FirebaseUser }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null);
  const [newDevice, setNewDevice] = useState<Partial<Device>>({ type: 'router', status: 'online' });

  console.log("DevicesView render:", { 
    deviceCount: devices.length, 
    isAdding, 
    editingDeviceId: editingDevice?.id, 
    deletingDeviceId 
  });

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevice.name || !newDevice.ip) return;
    
    await addDoc(collection(db, 'devices'), {
      ...newDevice,
      ownerId: user.uid,
      lastSeen: new Date().toISOString(),
      vendor: 'Cisco'
    });
    
    await addDoc(collection(db, 'logs'), {
      message: `New device added: ${newDevice.name} (${newDevice.ip})`,
      severity: 'info',
      timestamp: new Date().toISOString(),
      type: 'system'
    });

    setIsAdding(false);
    setNewDevice({ type: 'router', status: 'online' });
  };

  const handleUpdateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice || !editingDevice.id) return;

    const { id, ...data } = editingDevice;
    await updateDoc(doc(db, 'devices', id), data);

    await addDoc(collection(db, 'logs'), {
      message: `Device updated: ${editingDevice.name}`,
      severity: 'info',
      timestamp: new Date().toISOString(),
      type: 'system'
    });

    setEditingDevice(null);
  };

  const handleDeleteDevice = async () => {
    if (!deletingDeviceId) return;
    
    const device = devices.find(d => d.id === deletingDeviceId);
    await deleteDoc(doc(db, 'devices', deletingDeviceId));

    await addDoc(collection(db, 'logs'), {
      message: `Device decommissioned: ${device?.name || deletingDeviceId}`,
      severity: 'warning',
      timestamp: new Date().toISOString(),
      type: 'system'
    });

    setDeletingDeviceId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Network Inventory</h2>
          <p className="text-slate-500">Manage and monitor all connected infrastructure</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          Add Device
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-indigo-50/50 border-indigo-100">
              <form onSubmit={handleAddDevice} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hostname</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm"
                    placeholder="e.g. CORE-RTR-01"
                    value={newDevice.name || ''}
                    onChange={e => setNewDevice({...newDevice, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">IP Address</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm"
                    placeholder="10.0.0.1"
                    value={newDevice.ip || ''}
                    onChange={e => setNewDevice({...newDevice, ip: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Type</label>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm"
                    value={newDevice.type}
                    onChange={e => setNewDevice({...newDevice, type: e.target.value as any})}
                  >
                    <option value="router">Router</option>
                    <option value="switch">Switch</option>
                    <option value="firewall">Firewall</option>
                  </select>
                </div>
                <div className="flex items-end gap-3">
                  <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-bold text-sm">Save</button>
                  <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancel</button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {devices.map((device) => (
          <Card key={device.id} className="flex items-center justify-between hover:border-indigo-200 transition-colors group">
            <div className="flex items-center gap-6">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                device.type === 'router' ? 'bg-indigo-50 text-indigo-600' :
                device.type === 'switch' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              )}>
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{device.name}</h4>
                <p className="text-xs text-slate-400 font-mono">{device.ip} • {device.vendor}</p>
              </div>
            </div>

            <div className="flex items-center gap-12">
              <div className="text-center hidden sm:block">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <Badge variant={device.status === 'online' ? 'success' : 'error'}>{device.status}</Badge>
              </div>
              <div className="text-center hidden md:block">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Seen</p>
                <p className="text-xs font-medium text-slate-600">{new Date(device.lastSeen).toLocaleTimeString()}</p>
              </div>
              <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Edit button clicked for device:", device.name);
                    setEditingDevice(device);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Edit Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Delete button clicked for device ID:", device.id);
                    if (device.id) setDeletingDeviceId(device.id);
                  }}
                  className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                  title="Decommission Device"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      <Modal 
        isOpen={!!editingDevice} 
        onClose={() => setEditingDevice(null)}
        title="Edit Device Settings"
      >
        {editingDevice && (
          <form onSubmit={handleUpdateDevice} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hostname</label>
              <input 
                type="text" 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={editingDevice.name}
                onChange={e => setEditingDevice({...editingDevice, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">IP Address</label>
              <input 
                type="text" 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={editingDevice.ip}
                onChange={e => setEditingDevice({...editingDevice, ip: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Type</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
                  value={editingDevice.type}
                  onChange={e => setEditingDevice({...editingDevice, type: e.target.value as any})}
                >
                  <option value="router">Router</option>
                  <option value="switch">Switch</option>
                  <option value="firewall">Firewall</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
                  value={editingDevice.status}
                  onChange={e => setEditingDevice({...editingDevice, status: e.target.value as any})}
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold">Save Changes</button>
              <button type="button" onClick={() => setEditingDevice(null)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Cancel</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deletingDeviceId} 
        onClose={() => setDeletingDeviceId(null)}
        title="Decommission Device"
      >
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto">
            <X className="w-8 h-8 text-rose-600" />
          </div>
          <p className="text-slate-600">
            Are you sure you want to decommission this device? This action will remove it from the active inventory and stop all monitoring.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={handleDeleteDevice}
              className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-bold"
            >
              Confirm Decommission
            </button>
            <button 
              onClick={() => setDeletingDeviceId(null)}
              className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MonitoringView({ devices, token }: { devices: Device[], token: string }) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    if (devices.length > 0) {
      if (!selectedDevice || !devices.find(d => d.id === selectedDevice.id)) {
        setSelectedDevice(devices[0]);
      }
    } else {
      setSelectedDevice(null);
    }
  }, [devices]);

  useEffect(() => {
    if (!selectedDevice || !token) return;

    const fetchMetrics = async () => {
      try {
        const res = await fetch(`/api/monitoring/metrics/${selectedDevice.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch metrics');
        const data = await res.json();
        setMetrics(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [selectedDevice, token]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Select Device</h3>
        {devices.map(d => (
          <button
            key={d.id}
            onClick={() => setSelectedDevice(d)}
            className={cn(
              "w-full text-left p-4 rounded-2xl border transition-all",
              selectedDevice?.id === d.id 
                ? "bg-white border-indigo-600 shadow-lg shadow-indigo-50" 
                : "bg-white border-slate-200 hover:border-slate-300"
            )}
          >
            <p className="font-bold text-slate-900">{d.name}</p>
            <p className="text-xs text-slate-400 font-mono">{d.ip}</p>
          </button>
        ))}
      </div>

      <div className="lg:col-span-3 space-y-8">
        {selectedDevice ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">CPU Load</p>
                <p className="text-3xl font-bold text-indigo-600">{metrics[metrics.length-1]?.cpu}%</p>
              </Card>
              <Card className="text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Memory</p>
                <p className="text-3xl font-bold text-emerald-600">{metrics[metrics.length-1]?.memory}%</p>
              </Card>
              <Card className="text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Latency</p>
                <p className="text-3xl font-bold text-amber-600">{metrics[metrics.length-1]?.latency}ms</p>
              </Card>
            </div>

            <Card title="Real-time Performance Metrics" className="min-h-[450px]">
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="cpu" stroke="#6366f1" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="memory" stroke="#10b981" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="latency" stroke="#f59e0b" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            Select a device to view metrics
          </div>
        )}
      </div>
    </div>
  );
}

function AutomationView({ devices, token }: { devices: Device[], token: string }) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (devices.length > 0) {
      if (!selectedDevice || !devices.find(d => d.id === selectedDevice.id)) {
        setSelectedDevice(devices[0]);
      }
    } else {
      setSelectedDevice(null);
    }
  }, [devices]);

  const runCommand = async () => {
    if (!selectedDevice || !command || !token) return;
    
    setExecuting(true);
    setOutput(prev => [...prev, `> Executing: ${command}...`]);

    try {
      const res = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ device: selectedDevice, command })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success) {
        setOutput(prev => [...prev, data.output]);
        await addDoc(collection(db, 'logs'), {
          deviceId: selectedDevice.id,
          message: `Automation executed: ${command} on ${selectedDevice.name}`,
          severity: 'info',
          timestamp: new Date().toISOString(),
          type: 'automation'
        });
      }
    } catch (err: any) {
      setOutput(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setExecuting(false);
      setCommand('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <Card title="Automation Panel">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target Device</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={selectedDevice?.id || ''}
                onChange={e => setSelectedDevice(devices.find(d => d.id === e.target.value) || null)}
              >
                <option value="">Select a device...</option>
                {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.ip})</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Command Template</label>
              <div className="grid grid-cols-2 gap-2">
                {['show version', 'show ip int brief', 'reload', 'conf t'].map(cmd => (
                  <button 
                    key={cmd}
                    onClick={() => setCommand(cmd)}
                    className="p-2 text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 rounded-lg transition-colors text-slate-600 uppercase tracking-wider"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Custom Command</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono h-32"
                placeholder="Enter CLI command..."
                value={command}
                onChange={e => setCommand(e.target.value)}
              />
            </div>

            <button 
              onClick={runCommand}
              disabled={executing || !selectedDevice || !command}
              className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {executing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Terminal className="w-5 h-5" />}
              Execute Command
            </button>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card title="Terminal Output" className="h-full flex flex-col bg-slate-900 border-slate-800">
          <div className="flex-1 overflow-y-auto font-mono text-xs text-emerald-400 space-y-2 p-2 min-h-[500px]">
            {output.length === 0 && <p className="text-slate-600 italic">Waiting for command execution...</p>}
            {output.map((line, i) => (
              <pre key={i} className="whitespace-pre-wrap break-all">{line}</pre>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
