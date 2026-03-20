export interface Device {
  id?: string;
  name: string;
  ip: string;
  type: 'router' | 'switch' | 'firewall';
  status: 'online' | 'offline' | 'maintenance';
  vendor: string;
  lastSeen: string;
  ownerId: string;
}

export interface Metric {
  time: string;
  cpu: number;
  memory: number;
  latency: number;
}

export interface Log {
  id?: string;
  deviceId?: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  type: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
