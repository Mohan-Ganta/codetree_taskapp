# Codetree Taskapp Mobile App

Unified Task Management for Organizations.

## 🚀 Getting Started

### 1. Prerequisite
Ensure you have Node.js and npm installed.

### 2. Install Dependencies
```bash
cd codetree-taskapp
npm install
```

### 3. Run the App
To start the Expo development server:
```bash
npx expo start
```

## 📱 How to Use
- **Try as Main Officer**: Use username `admin` (any password). You can create tasks, manage officers, and review submitted tasks.
- **Try as Subordinate Officer**: Use username `officer` (any password). You can view assigned tasks, submit daily progress updates, and mark tasks as complete.

## ✨ Key Features (Implemented)
- **Role-Based Workflows**: Separate dashboards for Senior and Subordinate officers.
- **Task Lifecycle**: Full lifecycle tracking (Open → Submitted → Closed).
- **Daily Reporting**: Interactive slider for progress % and remarks.
- **Task Timeline**: Chronological log of all updates, reopens, and closures.
- **Accountability**: Visual flags for pending daily updates.
- **Premium UI**: Clean, government-themed design using Royal Blue and Gold aesthetics.

## 🛠️ Built With
- React Native (Expo)
- React Navigation (Bottom Tabs & Stack)
- Context API (State Management)
- Lucide React Native (Icons)
