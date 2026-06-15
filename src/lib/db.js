import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATHS = {
  admin: path.join(DATA_DIR, 'admin.json'),
  workers: path.join(DATA_DIR, 'workers.json'),
  attendance: path.join(DATA_DIR, 'attendance.json'),
  payments: path.join(DATA_DIR, 'payments.json'),
  sites: path.join(DATA_DIR, 'sites.json')
};

// Ensure data directory exists for local fallback
function ensureLocalDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  Object.keys(FILE_PATHS).forEach(key => {
    if (!fs.existsSync(FILE_PATHS[key])) {
      fs.writeFileSync(FILE_PATHS[key], JSON.stringify([], null, 2));
    }
  });
}

// Local storage helper
async function readLocalFile(key) {
  ensureLocalDir();
  const data = await fs.promises.readFile(FILE_PATHS[key], 'utf-8');
  return JSON.parse(data || '[]');
}

async function writeLocalFile(key, data) {
  ensureLocalDir();
  await fs.promises.writeFile(FILE_PATHS[key], JSON.stringify(data, null, 2), 'utf-8');
}

// Generate unique ID for local fallback
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// MongoDB Setup
const MONGODB_URI = process.env.MONGODB_URI;
let cachedConnection = null;

async function connectMongo() {
  if (cachedConnection) return cachedConnection;
  if (!MONGODB_URI) return null;

  try {
    const opts = { bufferCommands: false };
    cachedConnection = await mongoose.connect(MONGODB_URI, opts);
    console.log("Connected to MongoDB database.");
    return cachedConnection;
  } catch (e) {
    console.error("MongoDB connection error:", e);
    cachedConnection = null;
    throw e;
  }
}

// Mongoose Schemas & Models
const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  companyName: { type: String, default: "Purnima Construction" }
}, { timestamps: true });

const WorkerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, default: "" },
  role: { type: String, required: true },
  dailyWage: { type: Number, required: true },
  joiningDate: { type: String, required: true },
  status: { type: String, default: "Active" }, // Active, Inactive
  site: { type: String, default: "Main Site" }
}, { timestamps: true });

const AttendanceSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  status: { type: String, required: true }, // Present, Absent, Half Day
  site: { type: String, default: "" },
  notes: { type: String, default: "" }
}, { timestamps: true });

const PaymentSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  amount: { type: Number, required: true },
  type: { type: String, required: true }, // "Salary Paid", "Advance Paid"
  paymentMode: { type: String, default: "Cash" }, // Cash, UPI, Bank Transfer
  site: { type: String, default: "" },
  notes: { type: String, default: "" }
}, { timestamps: true });

const SiteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, default: "" },
  status: { type: String, default: "Active" } // Active, Closed
}, { timestamps: true });

const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);
const Worker = mongoose.models.Worker || mongoose.model("Worker", WorkerSchema);
const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
const Site = mongoose.models.Site || mongoose.model("Site", SiteSchema);

// UNIFIED DB INTERFACE
export const db = {
  // Admin Operations
  getAdmin: async () => {
    if (MONGODB_URI) {
      await connectMongo();
      return await Admin.findOne().lean();
    } else {
      const admins = await readLocalFile('admin');
      return admins.length > 0 ? admins[0] : null;
    }
  },

  createAdmin: async (adminData) => {
    if (MONGODB_URI) {
      await connectMongo();
      const adminCount = await Admin.countDocuments();
      if (adminCount > 0) throw new Error("Admin already setup");
      const admin = new Admin(adminData);
      const saved = await admin.save();
      return JSON.parse(JSON.stringify(saved));
    } else {
      const admins = await readLocalFile('admin');
      if (admins.length > 0) throw new Error("Admin already setup");
      const newAdmin = { _id: generateId(), ...adminData, companyName: adminData.companyName || "Purnima Construction" };
      admins.push(newAdmin);
      await writeLocalFile('admin', admins);
      return newAdmin;
    }
  },

  updateAdmin: async (adminData) => {
    if (MONGODB_URI) {
      await connectMongo();
      const admin = await Admin.findOne();
      if (!admin) throw new Error("Admin not setup");
      if (adminData.password) admin.password = adminData.password;
      if (adminData.companyName) admin.companyName = adminData.companyName;
      if (adminData.username) admin.username = adminData.username;
      const saved = await admin.save();
      return JSON.parse(JSON.stringify(saved));
    } else {
      const admins = await readLocalFile('admin');
      if (admins.length === 0) throw new Error("Admin not setup");
      const updatedAdmin = { ...admins[0], ...adminData };
      admins[0] = updatedAdmin;
      await writeLocalFile('admin', admins);
      return updatedAdmin;
    }
  },

  // Worker Operations
  getWorkers: async () => {
    if (MONGODB_URI) {
      await connectMongo();
      return await Worker.find().sort({ name: 1 }).lean();
    } else {
      const workers = await readLocalFile('workers');
      return workers.sort((a, b) => a.name.localeCompare(b.name));
    }
  },

  createWorker: async (workerData) => {
    if (MONGODB_URI) {
      await connectMongo();
      const worker = new Worker(workerData);
      const saved = await worker.save();
      return JSON.parse(JSON.stringify(saved));
    } else {
      const workers = await readLocalFile('workers');
      const newWorker = {
        _id: generateId(),
        ...workerData,
        joiningDate: workerData.joiningDate || new Date().toISOString().split('T')[0],
        status: workerData.status || "Active",
        site: workerData.site || "Main Site"
      };
      workers.push(newWorker);
      await writeLocalFile('workers', workers);
      return newWorker;
    }
  },

  updateWorker: async (id, workerData) => {
    if (MONGODB_URI) {
      await connectMongo();
      const updated = await Worker.findByIdAndUpdate(id, workerData, { new: true }).lean();
      return JSON.parse(JSON.stringify(updated));
    } else {
      const workers = await readLocalFile('workers');
      const idx = workers.findIndex(w => w._id === id);
      if (idx === -1) throw new Error("Worker not found");
      const updatedWorker = { ...workers[idx], ...workerData };
      workers[idx] = updatedWorker;
      await writeLocalFile('workers', workers);
      return updatedWorker;
    }
  },

  deleteWorker: async (id) => {
    if (MONGODB_URI) {
      await connectMongo();
      // Remove attendance logs and payments for this worker too
      await Worker.findByIdAndDelete(id);
      await Attendance.deleteMany({ workerId: id });
      await Payment.deleteMany({ workerId: id });
      return true;
    } else {
      let workers = await readLocalFile('workers');
      workers = workers.filter(w => w._id !== id);
      await writeLocalFile('workers', workers);

      let attendance = await readLocalFile('attendance');
      attendance = attendance.filter(a => a.workerId !== id);
      await writeLocalFile('attendance', attendance);

      let payments = await readLocalFile('payments');
      payments = payments.filter(p => p.workerId !== id);
      await writeLocalFile('payments', payments);

      return true;
    }
  },

  // Attendance Operations
  getAttendance: async (date) => {
    if (MONGODB_URI) {
      await connectMongo();
      return await Attendance.find({ date }).lean();
    } else {
      const attendance = await readLocalFile('attendance');
      return attendance.filter(a => a.date === date);
    }
  },

  getAttendanceRange: async (startDate, endDate) => {
    if (MONGODB_URI) {
      await connectMongo();
      return await Attendance.find({
        date: { $gte: startDate, $lte: endDate }
      }).lean();
    } else {
      const attendance = await readLocalFile('attendance');
      return attendance.filter(a => a.date >= startDate && a.date <= endDate);
    }
  },

  saveAttendance: async (date, records) => {
    // records: array of { workerId, status, site, notes }
    if (MONGODB_URI) {
      await connectMongo();
      const operations = records.map(rec => ({
        updateOne: {
          filter: { workerId: rec.workerId, date: date },
          update: {
            $set: {
              status: rec.status,
              site: rec.site || "",
              notes: rec.notes || ""
            }
          },
          upsert: true
        }
      }));
      await Attendance.bulkWrite(operations);
      return await Attendance.find({ date }).lean();
    } else {
      const attendance = await readLocalFile('attendance');
      // Filter out existing records for this date and workers in the update
      const workerIdsToUpdate = records.map(r => r.workerId);
      let newAttendance = attendance.filter(
        a => !(a.date === date && workerIdsToUpdate.includes(a.workerId))
      );

      records.forEach(rec => {
        newAttendance.push({
          _id: generateId(),
          workerId: rec.workerId,
          date: date,
          status: rec.status,
          site: rec.site || "",
          notes: rec.notes || ""
        });
      });

      await writeLocalFile('attendance', newAttendance);
      return newAttendance.filter(a => a.date === date);
    }
  },

  // Payment Operations
  getPayments: async (filters = {}) => {
    if (MONGODB_URI) {
      await connectMongo();
      let query = {};
      if (filters.workerId) query.workerId = filters.workerId;
      if (filters.startDate && filters.endDate) {
        query.date = { $gte: filters.startDate, $lte: filters.endDate };
      }
      return await Payment.find(query).sort({ date: -1, createdAt: -1 }).lean();
    } else {
      let payments = await readLocalFile('payments');
      if (filters.workerId) {
        payments = payments.filter(p => p.workerId === filters.workerId);
      }
      if (filters.startDate && filters.endDate) {
        payments = payments.filter(p => p.date >= filters.startDate && p.date <= filters.endDate);
      }
      return payments.sort((a, b) => b.date.localeCompare(a.date));
    }
  },

  createPayment: async (paymentData) => {
    if (MONGODB_URI) {
      await connectMongo();
      const payment = new Payment(paymentData);
      const saved = await payment.save();
      return JSON.parse(JSON.stringify(saved));
    } else {
      const payments = await readLocalFile('payments');
      const newPayment = {
        _id: generateId(),
        ...paymentData,
        date: paymentData.date || new Date().toISOString().split('T')[0],
        paymentMode: paymentData.paymentMode || "Cash",
        site: paymentData.site || "",
        notes: paymentData.notes || ""
      };
      payments.push(newPayment);
      await writeLocalFile('payments', payments);
      return newPayment;
    }
  },

  deletePayment: async (id) => {
    if (MONGODB_URI) {
      await connectMongo();
      await Payment.findByIdAndDelete(id);
      return true;
    } else {
      let payments = await readLocalFile('payments');
      payments = payments.filter(p => p._id !== id);
      await writeLocalFile('payments', payments);
      return true;
    }
  },

  // Site Operations
  getSites: async () => {
    if (MONGODB_URI) {
      await connectMongo();
      return await Site.find().sort({ name: 1 }).lean();
    } else {
      const sites = await readLocalFile('sites');
      return sites.sort((a, b) => a.name.localeCompare(b.name));
    }
  },

  createSite: async (siteData) => {
    if (MONGODB_URI) {
      await connectMongo();
      const site = new Site(siteData);
      const saved = await site.save();
      return JSON.parse(JSON.stringify(saved));
    } else {
      const sites = await readLocalFile('sites');
      const newSite = {
        _id: generateId(),
        ...siteData,
        status: siteData.status || "Active"
      };
      sites.push(newSite);
      await writeLocalFile('sites', sites);
      return newSite;
    }
  },

  updateSite: async (id, siteData) => {
    if (MONGODB_URI) {
      await connectMongo();
      const updated = await Site.findByIdAndUpdate(id, siteData, { new: true }).lean();
      return JSON.parse(JSON.stringify(updated));
    } else {
      const sites = await readLocalFile('sites');
      const idx = sites.findIndex(s => s._id === id);
      if (idx === -1) throw new Error("Site not found");
      const updatedSite = { ...sites[idx], ...siteData };
      sites[idx] = updatedSite;
      await writeLocalFile('sites', sites);
      return updatedSite;
    }
  }
};
