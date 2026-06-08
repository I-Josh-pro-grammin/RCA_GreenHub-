const bcrypt = require('bcryptjs');

// Simple unique ID generator
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// In-memory collections
const store = {
  users: [],
  projects: [],
  supportRequests: [],
  budgetRequests: [],
  announcements: [],
  transactions: [],
  auditLogs: [],
  notifications: []
};

// Populate default users with pre-hashed password
const initializeDefaultUsers = () => {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);

  const roles = [
    { name: 'Joshua Izere', email: 'student@greenhub.rca.rw', role: 'Student', avatar: 'JI' },
    { name: 'Teacher Mentor', email: 'teacher@greenhub.rca.rw', role: 'Teacher', avatar: 'TM' },
    { name: 'Web Dept Head', email: 'web@greenhub.rca.rw', role: 'Web Department Head', avatar: 'WH' },
    { name: 'Embedded Dept Head', email: 'embedded@greenhub.rca.rw', role: 'Embedded Systems Department Head', avatar: 'EH' },
    { name: 'Environment Dept Head', email: 'environment@greenhub.rca.rw', role: 'School & Community Environment Department Head', avatar: 'CD' },
    { name: 'Initiative Secretary', email: 'secretary@greenhub.rca.rw', role: 'Secretary', avatar: 'IS' },
    { name: 'Finance Officer', email: 'finance@greenhub.rca.rw', role: 'Finance Officer', avatar: 'FO' },
    { name: 'Head of All Departments', email: 'head@greenhub.rca.rw', role: 'Head of All Departments', avatar: 'HD' },
    { name: 'Eco Partner', email: 'investor@greenhub.rca.rw', role: 'Investor / Partner', avatar: 'EP' }
  ];

  roles.forEach((user, index) => {
    store.users.push({
      _id: `user-${index + 1}`,
      id: `user-${index + 1}`,
      name: user.name,
      email: user.email,
      password: passwordHash,
      role: user.role,
      avatar: user.avatar,
      gipPoints: user.role === 'Student' ? 245 : 0,
      profileCompleteness: 85 + (index % 3) * 5,
      createdAt: new Date()
    });
  });

  // Populate some initial projects
  const student = store.users.find(u => u.role === 'Student');
  const teacher = store.users.find(u => u.role === 'Teacher');

  store.projects.push(
    {
      _id: 'proj-1',
      id: 'proj-1',
      title: 'Smart Garden Irrigation Assistant',
      description: 'PROBLEM STATEMENT:\nManual watering at the RCA campus garden results in excessive water waste and dry plants due to inconsistent schedules.\n\nPROPOSED SOLUTION:\nAn automated IoT system using soil moisture sensors and an Arduino micro-controller to open water valves only when soil moisture is below 40%.\n\nENVIRONMENTAL IMPACT:\nReduces campus garden water usage by 35% and increases plant survival rates.\n\nSUPPORT NEEDED:\nSensors, Arduino boards, and testing space.',
      category: 'Embedded / IoT Project',
      department: 'Embedded Systems',
      stage: 'Prototype',
      targetArea: 'RCA Campus',
      githubLink: 'https://github.com/rca-greentech/smart-irrigation',
      liveDemo: '',
      supportNeeded: ['Materials', 'Testing space'],
      points: 75,
      status: 'Approved',
      author: student,
      isEndorsed: true,
      endorsedBy: teacher,
      isRecommendedForSupport: true,
      isRecommendedForInvestors: false,
      isFeatured: false,
      assignedMembers: [],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'proj-2',
      id: 'proj-2',
      title: 'Nyabihu District Waste Tracking Dashboard',
      description: 'PROBLEM STATEMENT:\nNyabihu District has no clear mechanism to coordinate garbage collection, leading to unmanaged waste heaps in public centers.\n\nPROPOSED SOLUTION:\nA lightweight React dashboard that allows local community leaders to mark garbage pickup needs and tracks collection routes.\n\nENVIRONMENTAL IMPACT:\nEnsures garbage is collected before overflowing, decreasing local soil and water pollution.\n\nSUPPORT NEEDED:\nHosting and Team members.',
      category: 'Nyabihu District Community Project',
      department: 'Web Development',
      stage: 'Planning',
      targetArea: 'Nyabihu District',
      githubLink: 'https://github.com/rca-greentech/nyabihu-waste',
      liveDemo: '',
      supportNeeded: ['Technical support', 'Team members', 'Hosting'],
      points: 120,
      status: 'Pending',
      author: student,
      isEndorsed: false,
      isRecommendedForSupport: false,
      isRecommendedForInvestors: false,
      isFeatured: false,
      assignedMembers: [],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  );

  // Populate some initial Announcements
  const secretary = store.users.find(u => u.role === 'Secretary');
  store.announcements.push(
    {
      _id: 'ann-1',
      id: 'ann-1',
      title: 'Welcome to the RCA GreenTech Initiative!',
      content: 'We are officially launching the RCA GreenHub platform today. Create your account, choose your role, and submit your green innovation ideas to earn Green Impact Points (GIP)! Let us collaborate to build a sustainable future.',
      author: secretary,
      visibility: 'Public',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'ann-2',
      id: 'ann-2',
      title: 'Upcoming Pitch Session for Nyabihu Projects',
      content: 'There will be a project pitching and review session next Wednesday in the main lab. All students who proposed ideas for Nyabihu District community outreach must prepare their slides.',
      author: secretary,
      visibility: 'Internal',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  );

  // Support Request
  store.supportRequests.push({
    _id: 'sup-1',
    id: 'sup-1',
    project: store.projects[0],
    requester: student,
    department: 'Embedded Systems',
    message: 'We need soil moisture sensors and 5V relays to build our smart watering prototype.',
    status: 'Pending',
    assignedTo: [],
    createdAt: new Date()
  });

  // Budget Request
  store.budgetRequests.push({
    _id: 'bud-1',
    id: 'bud-1',
    project: store.projects[0],
    requestedBy: store.users.find(u => u.role === 'Embedded Systems Department Head') || student,
    amount: 75000,
    reason: 'Purchase of 5 soil moisture sensors, 2 water pump valves, and a casing.',
    status: 'Pending',
    createdAt: new Date()
  });
};

initializeDefaultUsers();

// Deep copy helper for returning fresh objects
const copy = (obj) => {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
};

// Check if item matches MongoDB-like queries
const matches = (item, query) => {
  if (!query || Object.keys(query).length === 0) return true;
  for (const key in query) {
    let val = query[key];
    
    // Support nested querying (e.g. 'project.department')
    if (key.includes('.')) {
      const parts = key.split('.');
      let itemVal = item;
      for (const p of parts) {
        itemVal = itemVal ? itemVal[p] : undefined;
      }
      if (itemVal !== val) return false;
      continue;
    }

    // Standard matching
    if (key === '_id' || key === 'id') {
      if (item._id !== val && item.id !== val) return false;
    } else if (val && typeof val === 'object' && val.$in) {
      // support $in operator
      if (!val.$in.includes(item[key])) return false;
    } else {
      if (item[key] && typeof item[key] === 'object' && !Array.isArray(item[key])) {
        const idVal = item[key]._id || item[key].id;
        if (idVal && idVal.toString() === val.toString()) {
          continue;
        }
      }
      if (item[key] !== val) return false;
    }
  }
  return true;
};

// Database interface methods
const memoryDB = {
  find: async (collection, query = {}) => {
    const list = store[collection] || [];
    return copy(list.filter(item => matches(item, query)));
  },

  findOne: async (collection, query = {}) => {
    const list = store[collection] || [];
    const item = list.find(item => matches(item, query));
    return copy(item || null);
  },

  findById: async (collection, id) => {
    const list = store[collection] || [];
    const item = list.find(item => item._id === id || item.id === id);
    return copy(item || null);
  },

  create: async (collection, data) => {
    const newItem = {
      _id: generateId(),
      id: generateId(),
      ...copy(data),
      createdAt: new Date()
    };
    if (!store[collection]) {
      store[collection] = [];
    }
    store[collection].push(newItem);
    return copy(newItem);
  },

  findByIdAndUpdate: async (collection, id, data, options = {}) => {
    const list = store[collection] || [];
    const index = list.findIndex(item => item._id === id || item.id === id);
    if (index === -1) return null;
    
    const updatedItem = {
      ...list[index],
      ...copy(data)
    };
    list[index] = updatedItem;
    return copy(updatedItem);
  },

  deleteOne: async (collection, id) => {
    const list = store[collection] || [];
    const index = list.findIndex(item => item._id === id || item.id === id);
    if (index === -1) return false;
    list.splice(index, 1);
    return true;
  },

  // Direct access for aggregation/counting stats
  getRawCollection: (collection) => {
    return store[collection] || [];
  }
};

module.exports = memoryDB;
