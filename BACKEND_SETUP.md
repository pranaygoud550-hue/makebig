# Make Big - Real-time Backend Setup

## MongoDB + Mongoose + Socket.io Backend

This is a complete real-time backend for the Make Big collaboration platform.

### 🚀 Quick Start

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Setup MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB locally or use Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or with a custom volume:
docker run -d -p 27017:27017 -v mongodb_data:/data/db --name mongodb mongo:latest
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/make-big`

#### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/make-big
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:3000
```

#### 4. Run Backend Server

```bash
npm run api:dev
```

You should see:
```
✅ MongoDB Connected: mongodb://localhost:27017/make-big
🚀 Server running at http://localhost:5000
📡 WebSocket ready on ws://localhost:5000
```

#### 5. Run Frontend (in another terminal)

```bash
npm run dev
```

Visit: http://localhost:3000

---

## 📂 Backend Structure

```
backend/
├── db/
│   └── connection.js          # MongoDB connection setup
├── models/
│   ├── User.js               # User schema & model
│   ├── Profile.js            # Profile schema & model
│   ├── Project.js            # Project schema & model
│   ├── Activity.js           # Activity feed schema
│   ├── Message.js            # Real-time messages schema
│   ├── Notification.js       # Notifications schema
│   └── Invite.js             # Project invites schema
├── events/
│   └── socketEvents.js       # Socket.io event handlers
├── middleware/
│   ├── cors.js               # CORS configuration
│   └── auth.js               # JWT authentication
└── utils/
    └── helpers.js            # Helper functions
```

---

## 🔄 Real-time Features (Socket.io)

### Client-side Socket.io Setup

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join project room
socket.emit('join_project', {
  projectId: '123',
  userId: 'user-id',
  userName: 'John Doe',
  userContact: 'john@example.com'
});

// Listen for real-time messages
socket.on('new_message', (message) => {
  console.log('New message:', message);
});

// Send message
socket.emit('send_message', {
  projectId: '123',
  senderId: 'user-id',
  senderName: 'John Doe',
  content: 'Hello team!',
  type: 'text'
});

// Typing indicator
socket.emit('user_typing', {
  projectId: '123',
  userId: 'user-id',
  userName: 'John Doe',
  isTyping: true
});

// Listen for typing
socket.on('user_typing', (data) => {
  console.log(`${data.userName} is ${data.isTyping ? 'typing' : 'stopped typing'}`);
});

// Project updates
socket.on('project_changed', (data) => {
  console.log('Project updated:', data);
});

// Team member status
socket.on('member_status_changed', (data) => {
  console.log(`${data.memberName} status: ${data.status}`);
});

// Active users in project
socket.on('active_users', (users) => {
  console.log('Users online:', users);
});

// Notifications
socket.on('notification_received', (notification) => {
  console.log('Notification:', notification);
});

// Leave project
socket.emit('leave_project', {
  projectId: '123',
  userId: 'user-id',
  userName: 'John Doe'
});
```

---

## 📡 API Endpoints

### Authentication & Users

- `POST /api/users/upsert` - Login/Register user
  ```json
  {
    "name": "John Doe",
    "contact": "john@example.com"
  }
  ```
- `GET /api/users/:contact` - Get user by contact

### Profiles

- `POST /api/profile/upsert` - Create/update profile
- `GET /api/profile/:contact` - Get profile
- `GET /api/talent` - Get all available talent

### Projects

- `POST /api/projects/create` - Create project (requires auth)
- `GET /api/projects` - List projects (query: status, ownerContact, categoryId)
- `GET /api/projects/:projectId` - Get project details
- `PUT /api/projects/:projectId` - Update project (requires auth)
- `POST /api/projects/:projectId/publish` - Publish project

### Invites

- `POST /api/invites/send` - Send project invite (requires auth)
- `POST /api/invites/:inviteId/accept` - Accept invite

### Activities & Feed

- `GET /api/projects/:projectId/activities` - Get project activities
- `GET /api/projects/:projectId/messages` - Get project messages

### Notifications

- `GET /api/users/:userId/notifications` - Get user notifications
- `PUT /api/notifications/:notificationId/read` - Mark as read

---

## 🗄️ MongoDB Models

### User
```javascript
{
  name: String,
  contact: String (unique, lowercase),
  isLoggedIn: Boolean,
  skills: [String],
  hobbies: [String],
  lastActive: Date,
  socketId: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Profile
```javascript
{
  contact: String (unique, lowercase),
  role: 'member' | 'creator' | 'both',
  tagline: String,
  categoryIds: [String],
  skills: [String],
  rateMin: Number,
  rateMax: Number,
  currency: String,
  availableForInvites: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Project
```javascript
{
  categoryId: String,
  name: String,
  desc: String,
  roles: [String],
  salaryMin: Number,
  salaryMax: Number,
  currency: String,
  ownerContact: String,
  status: 'draft' | 'published' | 'in-progress' | 'completed' | 'closed',
  teamMembers: [{
    contact: String,
    role: String,
    status: 'invited' | 'joined' | 'completed' | 'left',
    joinedAt: Date
  }],
  maxTeamSize: Number,
  visibility: 'public' | 'private' | 'invite-only',
  createdAt: Date,
  updatedAt: Date
}
```

### Message
```javascript
{
  projectId: ObjectId,
  senderId: String,
  senderName: String,
  content: String,
  type: 'text' | 'system' | 'file' | 'task',
  attachments: [{url, name, type}],
  edited: Boolean,
  editedAt: Date,
  replies: [{_id, senderId, senderName, content, createdAt}],
  createdAt: Date,
  updatedAt: Date
}
```

### Activity
```javascript
{
  projectId: ObjectId,
  userId: String,
  type: 'project_created' | 'member_joined' | 'member_left' | 'project_updated' | 'comment_added' | 'task_completed' | 'milestone_reached' | 'team_message',
  description: String,
  metadata: Mixed,
  isRead: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Notification
```javascript
{
  userId: String,
  projectId: ObjectId,
  type: 'invite' | 'join' | 'message' | 'activity' | 'mention' | 'project_update',
  title: String,
  message: String,
  isRead: Boolean,
  actionUrl: String,
  metadata: Mixed,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🧪 Testing with cURL

### Create User
```bash
curl -X POST http://localhost:5000/api/users/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "contact": "john@example.com"
  }'
```

### Upsert Profile
```bash
curl -X POST http://localhost:5000/api/profile/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "contact": "john@example.com",
    "role": "creator",
    "tagline": "Full stack developer",
    "categoryIds": ["web", "ai"],
    "skills": ["React", "Node.js", "MongoDB"],
    "rateMin": 50,
    "rateMax": 100,
    "currency": "USD",
    "availableForInvites": true
  }'
```

### Create Project
```bash
curl -X POST http://localhost:5000/api/projects/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "E-commerce Platform",
    "desc": "Building a modern e-commerce platform",
    "categoryId": "web",
    "roles": ["Frontend Developer", "Backend Developer"],
    "salaryMin": 5000,
    "salaryMax": 10000,
    "currency": "USD"
  }'
```

### Get Projects
```bash
curl http://localhost:5000/api/projects?status=published
```

---

## 🔐 Security Best Practices

1. **Change JWT_SECRET** in production
2. **Use HTTPS** in production (update CORS accordingly)
3. **Validate all inputs** server-side
4. **Rate limit** API endpoints
5. **Use MongoDB Atlas** for production databases
6. **Enable Socket.io authentication** (already implemented)
7. **Keep dependencies updated** - `npm audit fix`

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```
❌ MongoDB Connection Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Start MongoDB or update `MONGODB_URI` in `.env`

### Socket.io Connection Issues
```
// Client-side error: Connection refused
```
**Solution**: 
- Check server is running on port 5000
- Verify CORS settings in `.env`
- Check firewall settings

### Port Already in Use
```
Error: listen EADDRINUSE :::5000
```
**Solution**: 
```bash
lsof -i :5000  # Find process
kill -9 <PID>   # Kill process
# Or use different PORT
PORT=5001 npm run api:dev
```

---

## 📦 Production Deployment

### Using Heroku

```bash
# 1. Create Heroku app
heroku create your-app-name

# 2. Set environment variables
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-secret

# 3. Deploy
git push heroku main

# 4. View logs
heroku logs -t
```

### Using Railway/Render

Similar process - set environment variables and deploy.

---

## 🤝 Contributing

Feel free to extend this backend with:
- Payment integration (Stripe)
- File uploads (AWS S3)
- Advanced search/filtering
- Admin dashboard
- Analytics

---

## 📝 License

MIT - Use freely!
