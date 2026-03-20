import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NodeSSH } from 'node-ssh';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET environment variable is not set!');
  process.exit(1);
}

const FINAL_JWT_SECRET = JWT_SECRET || 'nocc-dev-secret-key';

async function startServer() {
  if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is not set!');
  }
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // --- Mock Database for Auth (In a real app, use Firebase Auth or a DB) ---
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD && process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD environment variable is not set!');
  }
  const users = [
    { id: '1', email: 'admin@nocc.com', password: await bcrypt.hash(ADMIN_PASSWORD || 'admin123', 10), role: 'admin' }
  ];

  // --- Auth Routes ---
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, FINAL_JWT_SECRET, { expiresIn: '24h' });
      return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    }
    res.status(401).json({ error: 'Invalid credentials' });
  });

  // New endpoint to bridge Firebase Auth with our Backend JWT
  app.post('/api/auth/session', (req, res) => {
    const { uid, email, displayName } = req.body;
    if (!uid) return res.status(400).json({ error: 'UID required' });
    
    const token = jwt.sign({ id: uid, email, name: displayName, role: 'admin' }, FINAL_JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  });

  // --- Middleware for Protected Routes ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);

    jwt.verify(token, FINAL_JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- Automation Service ---
  app.post('/api/automation/execute', authenticateToken, async (req, res) => {
    const { device, command } = req.body;
    
    // In a real NOCC, we would use node-ssh to connect to the actual device.
    // For this demo, we simulate the execution.
    console.log(`Executing command "${command}" on device ${device.ip}`);
    
    const ssh = new NodeSSH();
    try {
      // Simulate SSH connection and command execution
      // In a real environment: await ssh.connect({ host: device.ip, username: device.username, password: device.password });
      // const result = await ssh.execCommand(command);
      
      // Simulated response
      setTimeout(() => {
        res.json({
          success: true,
          output: `[SIMULATED OUTPUT for ${device.name}]\n${command} executed successfully.\nConfig updated.`,
          timestamp: new Date().toISOString()
        });
      }, 1000);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Monitoring Service (Simulated Metrics) ---
  app.get('/api/monitoring/metrics/:deviceId', authenticateToken, (req, res) => {
    const { deviceId } = req.params;
    // Generate some random metrics for the chart
    const metrics = Array.from({ length: 10 }, (_, i) => ({
      time: new Date(Date.now() - (9 - i) * 60000).toLocaleTimeString(),
      cpu: Math.floor(Math.random() * 40) + 20,
      memory: Math.floor(Math.random() * 30) + 40,
      latency: Math.floor(Math.random() * 50) + 10
    }));
    res.json(metrics);
  });

  // --- Vite Middleware for Development ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NOCC Server running on http://localhost:${PORT}`);
  });
}

startServer();
