# Backend Setup Quick Reference

## ⚡ Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start MongoDB (Choose one)

**Docker (Recommended)**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Local MongoDB**
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### 3. Create .env (Already created for you!)
```bash
# File is ready at /.env
# Contains all necessary settings for development
```

### 4. Start Backend
```bash
npm run api:dev
```

You should see:
```
✅ MongoDB Connected: mongodb://localhost:27017/make-big
🚀 Server running at http://localhost:5000
📡 WebSocket ready on ws://localhost:5000
```

### 5. Start Frontend (New terminal)
```bash
npm run dev
```

Visit: http://localhost:3000

---

## 🔄 Real-time Features Available

✅ **Live Chat** - Instant messaging between team members  
✅ **Typing Indicators** - See who's typing in real-time  
✅ **Active Users** - Know who's online in your project  
✅ **Activity Feed** - Real-time project updates  
✅ **Notifications** - Instant alerts for invites and updates  
✅ **Project Updates** - Live synchronization across users  
✅ **Team Status** - Real-time member status changes  

---

## 📡 API Endpoints Ready to Use

### User Management
```bash
POST   /api/users/upsert          # Login/Register
GET    /api/users/:contact        # Get user profile
```

### Profile Management
```bash
POST   /api/profile/upsert        # Create/update profile
GET    /api/profile/:contact      # Get profile
GET    /api/talent                # Get all available talent
```

### Projects (Team Collaboration)
```bash
POST   /api/projects/create              # Create project
GET    /api/projects                     # List projects
GET    /api/projects/:projectId          # Get project details
PUT    /api/projects/:projectId          # Update project
POST   /api/projects/:projectId/publish  # Publish project
```

### Team Collaboration
```bash
POST   /api/invites/send                 # Send invite
POST   /api/invites/:inviteId/accept     # Accept invite
GET    /api/projects/:projectId/messages # Get messages
GET    /api/projects/:projectId/activities # Get activities
```

### Notifications
```bash
GET    /api/users/:userId/notifications              # Get notifications
PUT    /api/notifications/:notificationId/read       # Mark as read
```

---

## 🧪 Test With cURL

### Test Backend Health
```bash
curl http://localhost:5000/api/health
```

### Create User
```bash
curl -X POST http://localhost:5000/api/users/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "contact": "alice@example.com"
  }'
```

### Create Profile
```bash
curl -X POST http://localhost:5000/api/profile/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "contact": "alice@example.com",
    "role": "creator",
    "skills": ["React", "Node.js"],
    "categoryIds": ["web"],
    "rateMin": 50,
    "rateMax": 100,
    "currency": "USD",
    "availableForInvites": true
  }'
```

---

## 🔗 Frontend Integration

Add to your components (example in `lib/useProjectSocket.js`):

```javascript
import useProjectSocket from '@/lib/useProjectSocket';

export function MyComponent() {
  const {
    messages,
    activeUsers,
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
    // Your UI here
  );
}
```

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Development environment variables |
| `.env.example` | Example configuration template |
| `server-new.js` | Main backend server with MongoDB + Socket.io |
| `backend/db/connection.js` | MongoDB connection setup |
| `backend/models/*.js` | Mongoose schemas |
| `backend/events/socketEvents.js` | Socket.io real-time handlers |
| `backend/middleware/*.js` | Auth & CORS middleware |

---

## 🚀 What's Implemented

### Backend Features
- ✅ User authentication with JWT tokens
- ✅ Profile management with skills & availability
- ✅ Project creation and publishing
- ✅ Team collaboration & invitations
- ✅ Real-time messaging via Socket.io
- ✅ Activity feed & notifications
- ✅ User presence tracking
- ✅ Typing indicators
- ✅ CORS security
- ✅ MongoDB data persistence

### Real-time Events
- ✅ `join_project` - User enters project
- ✅ `leave_project` - User leaves project
- ✅ `send_message` - Real-time chat
- ✅ `user_typing` - Typing indicator
- ✅ `project_updated` - Live sync
- ✅ `member_status_changed` - Status updates
- ✅ `task_completed` - Task notifications
- ✅ `send_notification` - Instant alerts

---

## 📚 Next Steps

1. **Customize Models** - Add more fields to schemas as needed
2. **Add Validation** - Implement input validation middleware
3. **Add Authentication** - Integrate with auth service (Google, GitHub, etc.)
4. **File Uploads** - Integrate AWS S3 or similar
5. **Payment** - Add Stripe integration for projects
6. **Analytics** - Track user activity and metrics
7. **Search** - Add project & talent search
8. **Admin Dashboard** - Monitor projects and users

---

## 🔐 Security Tips

- ✅ JWT tokens for authentication
- ✅ CORS configured for frontend
- ✅ Socket.io auth middleware
- ✅ Lowercase unique contacts

### Additional Security (Recommended)
- [ ] Rate limiting on endpoints
- [ ] Input validation & sanitization
- [ ] Password hashing (bcrypt)
- [ ] HTTPS in production
- [ ] Environment secrets management
- [ ] Database backups
- [ ] Error logging & monitoring

---

## 🆘 Troubleshooting

### MongoDB won't connect
```bash
# Check if MongoDB is running
docker ps  # if using Docker
# or
brew services list  # if using local
```

### Port 5000 already in use
```bash
# Find and kill process
lsof -i :5000
kill -9 <PID>

# Or use different port
PORT=5001 npm run api:dev
```

### Socket.io connection failing
- Check server is running: http://localhost:5000/api/health
- Check CORS settings in `.env`
- Verify frontend is using correct URL

### npm install fails
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 💡 Example Use Cases

1. **Team Chat During Project** - Real-time messaging in project room
2. **Live Activity Feed** - See team updates as they happen
3. **Instant Notifications** - Get alerts when invited to projects
4. **Presence Awareness** - Know who's actively working
5. **Typing Indicators** - See collaboration in real-time
6. **Project Sync** - Changes appear instantly for all members

---

## 📞 Support

For detailed documentation, see:
- `BACKEND_SETUP.md` - Complete setup guide
- `backend/models/` - Database schemas
- `backend/events/socketEvents.js` - Socket.io events
- `lib/useProjectSocket.js` - Frontend integration example

---

**Ready to build real-time features! 🚀**
