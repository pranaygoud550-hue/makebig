# 🚀 MongoDB + Mongoose + Socket.io Backend - Complete Setup

## ✅ What's Been Created

Your project now has a complete real-time backend infrastructure with the following components:

### 📁 Backend Structure
```
backend/
├── db/
│   └── connection.js                 # MongoDB connection manager
├── models/
│   ├── User.js                       # User schema (contact, skills, etc.)
│   ├── Profile.js                    # Profile schema (role, tagline, rates)
│   ├── Project.js                    # Project schema (team collaboration)
│   ├── Activity.js                   # Activity feed schema
│   ├── Message.js                    # Real-time messages schema
│   ├── Notification.js               # Notifications schema
│   └── Invite.js                     # Project invites schema
├── events/
│   └── socketEvents.js               # Socket.io event handlers (messaging, typing, etc.)
├── middleware/
│   ├── cors.js                       # CORS configuration (frontend access)
│   └── auth.js                       # JWT authentication
└── utils/
    └── helpers.js                    # Utility functions
```

### 📄 Configuration Files
- **`.env`** - Development environment (already configured for localhost)
- **`.env.example`** - Template for environment variables
- **`server-new.js`** - Main backend server with Express + MongoDB + Socket.io
- **`package.json`** - Updated with all necessary dependencies

### 📚 Documentation
- **`BACKEND_SETUP.md`** - Complete 50+ section guide with examples
- **`BACKEND_QUICK_REF.md`** - Quick start & troubleshooting
- **`lib/useProjectSocket.js`** - React hook for Socket.io integration + example components

---

## 🎯 Features Ready to Use

### ✨ Real-time Features (Socket.io)
✅ Live team chat with messages  
✅ Typing indicators (see who's typing)  
✅ Active users list (who's online)  
✅ Activity feed (real-time updates)  
✅ Instant notifications  
✅ Project sync (live updates)  
✅ Team member status  
✅ Task completion notifications  

### 📊 Data Models
✅ User accounts with skills & contact  
✅ Profiles with rates & availability  
✅ Projects with team collaboration  
✅ Messages & comments  
✅ Activity tracking  
✅ Invitations system  
✅ Notifications  

### 🔒 Security
✅ JWT token authentication  
✅ CORS protection  
✅ Socket.io auth middleware  
✅ Secure contact management  

---

## 🚀 Getting Started (3 Steps)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start MongoDB (choose one method)

**Option A: Docker (Recommended)**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option B: Local Installation**
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Step 3: Start Backend & Frontend

**Terminal 1 - Backend:**
```bash
npm run api:dev
```

Expected output:
```
✅ MongoDB Connected: mongodb://localhost:27017/make-big
🚀 Server running at http://localhost:5000
📡 WebSocket ready on ws://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## 📡 API Endpoints

### User & Auth
```
POST   /api/users/upsert           - Login/Register user
GET    /api/users/:contact         - Get user by contact
```

### Profiles
```
POST   /api/profile/upsert         - Create/update profile
GET    /api/profile/:contact       - Get profile
GET    /api/talent                 - Get all available talent
```

### Projects
```
POST   /api/projects/create        - Create new project
GET    /api/projects               - List all projects (with filters)
GET    /api/projects/:projectId    - Get project details
PUT    /api/projects/:projectId    - Update project
POST   /api/projects/:projectId/publish - Publish project
```

### Team & Invites
```
POST   /api/invites/send           - Send project invite
POST   /api/invites/:id/accept     - Accept invitation
```

### Communication
```
GET    /api/projects/:projectId/messages    - Get project messages
GET    /api/projects/:projectId/activities  - Get project activities
GET    /api/users/:userId/notifications     - Get user notifications
PUT    /api/notifications/:id/read          - Mark notification as read
```

---

## 🔄 Real-time Socket.io Events

### Client → Server (Emit)
```javascript
// Join/Leave
socket.emit('join_project', { projectId, userId, userName, userContact })
socket.emit('leave_project', { projectId, userId, userName })

// Messaging
socket.emit('send_message', { projectId, senderId, senderName, content, type })
socket.emit('user_typing', { projectId, userId, userName, isTyping })

// Updates
socket.emit('project_updated', { projectId, updatedFields, updatedBy, updatedByName })
socket.emit('member_status_changed', { projectId, memberId, memberName, status })
socket.emit('task_completed', { projectId, completedBy, completedByName, taskName })

// Notifications
socket.emit('send_notification', { toUserId, type, title, message, actionUrl, metadata })
```

### Server → Client (Listen)
```javascript
socket.on('new_message', (message) => {})
socket.on('user_joined', (data) => {})
socket.on('user_left', (data) => {})
socket.on('user_typing', (data) => {})
socket.on('active_users', (users) => {})
socket.on('project_changed', (data) => {})
socket.on('member_status_changed', (data) => {})
socket.on('task_completed', (data) => {})
socket.on('notification_received', (notification) => {})
```

---

## 🧪 Quick Test Examples

### Test Backend is Running
```bash
curl http://localhost:5000/api/health
# Response: {"success":true,"data":{"status":"ok","time":"..."},...}
```

### Create a User
```bash
curl -X POST http://localhost:5000/api/users/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "contact": "john@example.com"
  }'
```

### Create a Profile
```bash
curl -X POST http://localhost:5000/api/profile/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "contact": "john@example.com",
    "role": "creator",
    "skills": ["React", "Node.js"],
    "categoryIds": ["web"],
    "rateMin": 50,
    "rateMax": 100,
    "currency": "USD",
    "availableForInvites": true
  }'
```

### Get Talent
```bash
curl http://localhost:5000/api/talent
# Lists all available talent profiles
```

---

## 🎨 Frontend Integration Example

React Hook for Socket.io:

```javascript
import useProjectSocket from '@/lib/useProjectSocket';

export function ChatComponent() {
  const {
    messages,
    activeUsers,
    typingUsers,
    sendMessage,
    emitTyping,
    isConnected
  } = useProjectSocket(
    projectId,
    userId,
    userName,
    userContact,
    token
  );

  return (
    <div>
      <h2>Active Users: {activeUsers.length}</h2>
      <div>
        {messages.map(msg => (
          <div key={msg._id}>
            <strong>{msg.senderName}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <input 
        onChange={(e) => {
          setInput(e.target.value);
          emitTyping(true);
        }}
      />
      <button onClick={() => sendMessage(input)}>Send</button>
    </div>
  );
}
```

---

## 🗄️ MongoDB Collections

Your database will auto-create these collections:

| Collection | Purpose |
|-----------|---------|
| `users` | User accounts & authentication |
| `profiles` | User profiles with skills/rates |
| `projects` | Projects & team assignments |
| `messages` | Real-time chat messages |
| `activities` | Activity feed |
| `notifications` | User notifications |
| `invites` | Team member invitations |

---

## 🔐 Environment Variables

`.env` file is pre-configured with:
```
PORT=5000                                    # Backend server port
NODE_ENV=development                         # Environment
MONGODB_URI=mongodb://localhost:27017/make-big  # Local MongoDB
JWT_SECRET=dev-secret-key-...               # JWT signing key
FRONTEND_URL=http://localhost:3000          # Frontend for CORS
```

**For Production:**
- Change `JWT_SECRET` to a strong random string
- Update `MONGODB_URI` to MongoDB Atlas
- Set `NODE_ENV=production`
- Update `FRONTEND_URL` to your domain

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `BACKEND_SETUP.md` | Comprehensive 50+ section guide with MongoDB schemas, curl examples, deployment info |
| `BACKEND_QUICK_REF.md` | Quick reference for common tasks and troubleshooting |
| `lib/useProjectSocket.js` | React hook + example chat & activity feed components |
| `backend/models/` | Mongoose schema definitions |
| `backend/events/socketEvents.js` | Socket.io event documentation |

---

## ✅ Checklist

- ✅ Express backend server configured
- ✅ MongoDB + Mongoose setup complete
- ✅ Socket.io real-time messaging
- ✅ JWT authentication
- ✅ CORS security
- ✅ Database schemas created
- ✅ API endpoints ready
- ✅ Socket.io events defined
- ✅ Frontend hook created
- ✅ Environment configured
- ✅ Documentation provided

---

## 🆘 Common Issues & Solutions

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Fix:** Start MongoDB (Docker or local)

### Socket.io Won't Connect
**Fix:** Ensure backend is running on http://localhost:5000

### Port 5000 Already in Use
**Fix:** Change PORT in `.env` or kill existing process

### npm install Fails
**Fix:** 
```bash
rm -rf node_modules package-lock.json
npm install
```

See `BACKEND_QUICK_REF.md` for more troubleshooting.

---

## 🚀 Next Steps

1. **Customize Schemas** - Add more fields to database models as needed
2. **Add Validation** - Implement input validation for endpoints
3. **Frontend Integration** - Use the provided Socket.io hook in your components
4. **Testing** - Create unit tests for Socket.io events
5. **Deployment** - Deploy to Heroku, Railway, or your server
6. **Advanced Features** - Add file uploads, payments, search, etc.

---

## 📖 Key Files to Review

1. **`server-new.js`** - Main application server
2. **`backend/db/connection.js`** - Database setup
3. **`backend/events/socketEvents.js`** - Real-time events
4. **`lib/useProjectSocket.js`** - Frontend integration
5. **`BACKEND_SETUP.md`** - Complete documentation

---

## 💡 Commands Reference

```bash
# Development
npm install              # Install dependencies
npm run api:dev          # Start backend server
npm run dev              # Start Next.js frontend

# Production
npm run api:prod         # Start backend (production)
npm run build            # Build Next.js
npm start                # Start Next.js (production)

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
docker stop mongodb
docker rm mongodb
```

---

## 🎉 You're All Set!

Your real-time backend is ready. Start the servers and begin building amazing real-time features!

**Questions? Check:**
- `BACKEND_SETUP.md` - Detailed guide
- `BACKEND_QUICK_REF.md` - Quick answers
- `backend/` folders - Source code comments

**Happy building! 🚀**
