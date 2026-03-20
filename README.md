# Network Operations Control Center (NOCC)

An enterprise-grade system for monitoring and automating network devices.

## 🚀 Features

- **Real-time Dashboard**: Monitor traffic, device status, and system health.
- **Device Inventory**: CRUD operations for routers, switches, and firewalls.
- **Monitoring Service**: Live performance metrics (CPU, Memory, Latency) with charts.
- **Automation Service**: Remote command execution via SSH (simulated in demo).
- **Secure Access**: JWT-based authentication and Firebase Firestore security rules.

## 🧠 Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, Lucide Icons, Recharts, Motion.
- **Backend**: Node.js, Express, JWT, Node-SSH.
- **Database**: Firebase Firestore.
- **Architecture**: Modular microservices (Device, Monitoring, Automation).

## 🛠️ Setup Instructions

1. **Firebase Setup**:
   - The app uses Firebase Firestore for data storage.
   - Ensure `GOOGLE_MAPS_PLATFORM_KEY` (if used) or other secrets are configured in AI Studio.
   - Firestore rules are already deployed.

2. **Authentication**:
   - Sign in using any Google account (configured via Firebase Auth).
   - Default role is "Network Admin".

3. **Running the App**:
   - The app starts automatically using `tsx server.ts`.
   - Access the dashboard at the provided App URL.

## 📂 Project Structure

- `/server.ts`: Express backend with modular service routes.
- `/src/App.tsx`: Main React application with all views.
- `/src/firebase.ts`: Firebase client initialization.
- `/firestore.rules`: Security rules for the database.
- `/firebase-blueprint.json`: Data structure definition.

## 🔐 Security

- **JWT**: Used for API authentication between frontend and backend.
- **Firestore Rules**: Restrict access to authenticated users and enforce data validation.
- **Least Privilege**: Users can only manage devices they own.

---
*Authorized Personnel Only. All actions are logged in the system audit trail.*
