/**
 * Integration tests — Express API (server-new.js) against in-memory MongoDB.
 * Run: npm run test:integration
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const TEST_JWT_SECRET = 'integration-test-jwt-secret-make-big-32chars';
const DOMAIN = 'integration.makebig.test';

let mongod;
let app;
let mongoose;
let User;
let Project;
let Invite;

function email(label) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@${DOMAIN}`;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGO_URI = mongod.getUri();
  process.env.SKIP_SERVER_START = 'true';
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.ALLOW_DEV_OTP = 'true';

  const connection = await import('../../backend/db/connection.js');
  mongoose = connection.default;
  await connection.connectDB();

  const serverModule = await import('../../server-new.js');
  app = serverModule.default;

  User = (await import('../../backend/models/User.js')).default;
  Project = (await import('../../backend/models/Project.js')).default;
  Invite = (await import('../../backend/models/Invite.js')).default;
});

afterAll(async () => {
  if (mongoose?.connection?.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (mongod) await mongod.stop();
});

describe('Make Big API integration', () => {
  const owner = { contact: email('owner'), name: 'Project Owner', token: '', userId: '' };
  const invitee = { contact: email('invitee'), name: 'Team Invitee', token: '', userId: '' };
  let projectId = '';
  let inviteId = '';

  it('1. user signup via POST /api/users/upsert', async () => {
    const res = await request(app)
      .post('/api/users/upsert')
      .send({
        name: owner.name,
        contact: owner.contact,
        skills: ['react', 'node'],
        college: 'JNTU Hyderabad',
        graduationYear: '2027',
        oauth: true,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.contact).toBe(owner.contact);
    expect(res.body.data.token).toBeTruthy();

    owner.token = res.body.data.token;
    owner.userId = res.body.data.user.id;

    const inDb = await User.findOne({ contact: owner.contact }).lean();
    expect(inDb).toBeTruthy();
    expect(inDb.name).toBe(owner.name);
  });

  it('2. project creation via POST /api/projects/create', async () => {
    const res = await request(app)
      .post('/api/projects/create')
      .set(auth(owner.token))
      .send({
        name: 'Integration Test Startup',
        desc: 'Built during automated integration tests',
        categoryId: 'tech',
        roles: ['developer', 'designer'],
        city: 'Hyderabad',
        state: 'Telangana',
        projectPurpose: 'college',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.project).toBeDefined();
    expect(res.body.data.project.name).toBe('Integration Test Startup');
    expect(res.body.data.project.ownerContact).toBe(owner.contact);

    projectId = res.body.data.project.id;

    const inDb = await Project.findById(projectId).lean();
    expect(inDb).toBeTruthy();
    expect(inDb.ownerContact).toBe(owner.contact);
  });

  it('3. task creation inside a project', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(auth(owner.token))
      .send({
        title: 'Ship MVP landing page',
        description: 'First task from integration test',
        priority: 'high',
        assignee: owner.contact,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.task.title).toBe('Ship MVP landing page');
    expect(res.body.data.task.status).toBe('todo');

    const project = await Project.findById(projectId).lean();
    expect(project.tasks).toHaveLength(1);
    expect(project.tasks[0].title).toBe('Ship MVP landing page');
  });

  it('4. sending an invite to join a project', async () => {
    const signup = await request(app)
      .post('/api/users/upsert')
      .send({
        name: invitee.name,
        contact: invitee.contact,
        skills: ['ui/ux'],
        college: 'OU Hyderabad',
        oauth: true,
      })
      .expect(200);

    invitee.token = signup.body.data.token;
    invitee.userId = signup.body.data.user.id;

    const res = await request(app)
      .post('/api/invites/send')
      .set(auth(owner.token))
      .send({
        projectId,
        receiverContact: invitee.contact,
        role: 'designer',
        message: 'Join our integration test project!',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.invite).toBeDefined();
    expect(res.body.data.invite.receiverContact).toBe(invitee.contact);
    expect(res.body.data.invite.status).toBe('pending');

    inviteId = res.body.data.invite.id;

    const inDb = await Invite.findById(inviteId).lean();
    expect(inDb).toBeTruthy();
    expect(inDb.status).toBe('pending');
  });

  it('5. accepting an invite and becoming a team member', async () => {
    const res = await request(app)
      .post(`/api/invites/${inviteId}/accept`)
      .set(auth(invitee.token))
      .send({})
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.invite.status).toBe('accepted');

    const project = await Project.findById(projectId).lean();
    const member = (project.teamMembers || []).find(
      (m) => m.contact === invitee.contact && m.status === 'joined'
    );
    expect(member).toBeTruthy();
    expect(member.role).toBe('designer');

    const membersRes = await request(app)
      .get(`/api/projects/${projectId}/members`)
      .expect(200);

    expect(membersRes.body.success).toBe(true);
    const contacts = (membersRes.body.data.members || []).map((m) => m.contact);
    expect(contacts).toContain(invitee.contact);

    const inviteeTask = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(auth(invitee.token))
      .send({ title: 'Design onboarding screens', priority: 'medium' })
      .expect(200);

    expect(inviteeTask.body.data.task.title).toBe('Design onboarding screens');
  });
});
