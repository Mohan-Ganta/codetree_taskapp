require('dotenv').config();
console.log('💎 SERVER.JS INITIALIZING...');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { sequelize, Officer, Task, Notification, Appointment } = require('./models');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { Expo } = require('expo-server-sdk');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const expo = new Expo();

// --- File Upload Setup ---
const uploadDir = path.join(__dirname, 'uploads', 'idproofs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const qrCodesDir = path.join(__dirname, 'uploads', 'qrcodes');
if (!fs.existsSync(qrCodesDir)) fs.mkdirSync(qrCodesDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E6);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

// --- SMS / WhatsApp API Helper ---
const SMS_BASE_URL = 'https://ctapps.in/othsms/api/thirdparty';
const SMS_AUTH = 'Basic eW9nYTpjM1Z5WlhOb09qRXlNelExTmc9PQ==';
const DLT_ID = '1307172552050147317';

async function sendSMS(mobile, message) {
    try {
        const axios = require('axios');
        const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
        const res = await axios.post(`${SMS_BASE_URL}/smotp`, {
            param1: cleanMobile,
            param2: message,
            param3: DLT_ID
        }, {
            headers: {
                Authorization: SMS_AUTH,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ SMS sent to', mobile, ':', res.data);
        return true;
    } catch (err) {
        console.error('❌ SMS failed:', err.message);
        return false;
    }
}

async function sendWhatsApp(mobile, message) {
    try {
        const axios = require('axios');
        const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
        
        const res = await axios.post(`${SMS_BASE_URL}/whotp`, {
            param1: cleanMobile,
            param2: message,
            param3: DLT_ID
        }, {
            headers: {
                Authorization: SMS_AUTH,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ ctapps.in WhatsApp sent to', cleanMobile, ':', res.data);
        return true;
    } catch (err) {
        console.error('❌ ctapps.in WhatsApp failed:', err.response ? JSON.stringify(err.response.data) : err.message);
        return false;
    }
}

async function submitGatePass(appointment) {
    try {
        const axios = require('axios');
        const res = await axios.post(
            'https://sacs.ap.gov.in/apis/SACS_Gate_pass_codetree.php',
            {
                GatePassRequest: 'true',
                name: appointment.name,
                id_proof: appointment.idProofType || '1',
                id_number: appointment.idNumber || '',
                visiter_mobile_no: appointment.mobile,
                sender_mobile_no: appointment.mobile,
                no_of_persons: String(appointment.noOfPersons || 1),
                date: appointment.date,
                time: appointment.time,
                department: '18',
                peshi: '6',
                type_of_visitor: appointment.visitorType || 'Official',
                entry_mode: '1',
                vehicle_no: appointment.vehicleNo || '',
                purpose_of_visit: appointment.subject || 'Meeting'
            },
            {
                headers: {
                    Username: 'ITEC_CODETREE',
                    Password: 'ITE&C2026$#@324',
                    apikey: 'bb29cd01b201c0e5c54f59da0aea139d',
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ Gate Pass submitted:', res.data);
        if (res.data && res.data.result === 'Success') {
            return res.data.visitor_id;
        }
        return null;
    } catch (err) {
        console.error('❌ Gate Pass Error:', err.message);
        return null;
    }
}

const transporter = nodemailer.createTransport({
    // Using direct IPv4 address to bypass Render's broken IPv6 routing
    host: '74.125.136.108',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false,
        servername: 'smtp.gmail.com' // Crucial for certificate matching
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    family: 4
});

// Verify transporter
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ SMTP Transporter Error:', error);
    } else {
        console.log('✅ SMTP Transporter: Ready to send emails');
    }
});

const app = express();

// Helper to create notifications
const createNotification = async (recipientId, title, body, taskId) => {
    try {
        await Notification.create({
            recipient: recipientId,
            title,
            body,
            taskId
        });

        // Send Remote Push Notification
        console.log(`📡 Sending push notification to Recipient: ${recipientId}`);
        const officer = await Officer.findByPk(recipientId);
        if (officer && officer.pushToken && Expo.isExpoPushToken(officer.pushToken)) {
            const messages = [{
                to: officer.pushToken,
                sound: 'default',
                title: title,
                body: body,
                data: { taskId: taskId ? taskId.toString() : null },
                priority: 'high',
                channelId: 'default'
            }];
            
            try {
                const chunks = expo.chunkPushNotifications(messages);
                for (let chunk of chunks) {
                    await expo.sendPushNotificationsAsync(chunk);
                }
                console.log('✅ Push notification sent successfully');
            } catch (pushErr) {
                console.error('❌ Push notification delivery failed:', pushErr.message);
            }
        } else {
            console.log('⚠️ No valid push token found for officer:', recipientId);
        }
    } catch (err) {
        console.error('Notification logic failed:', err.message);
    }
};

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use((req, res, next) => {
    if (req.path.includes('auth')) {
        console.log('📡 Request Incoming:', req.method, req.path, 'Type:', req.headers['content-type']);
    }
    next();
});

app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

// Handle JSON parsing errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('❌ JSON Parsing Error:', err.message);
        console.error('📦 Raw Body Received:', req.rawBody);
        return res.status(400).json({ message: 'Invalid JSON format in request' });
    }
    next();
});

// --- BASE ROUTE ---

// --- BASE ROUTE ---
app.use(express.static(path.join(__dirname, 'Meeting-Portal')));

app.get('/api', (req, res) => {
    res.json({
        message: 'Welcome to Codetree Taskapp API 🚀',
        status: 'Online',
        domain: req.hostname
    });
});

// --- APP VERSION CHECK ---
// Update latestVersion here whenever you release a new build
const APP_VERSION_CONFIG = {
    latestVersion: '1.0.0',   // <-- bump this to force update
    forceUpdate: false,        // <-- set true to block old versions
    updateMessage: 'A new version of Codetree Taskapp is available. Please update to continue.',
    androidUrl: 'https://play.google.com/store/apps/details?id=com.codetree.taskapp',
    iosUrl: 'https://apps.apple.com/app/id0000000000'
};

app.get('/api/app-version', (req, res) => {
    res.json(APP_VERSION_CONFIG);
});

// Database Connection
sequelize.authenticate()
    .then(() => {
        console.log('✅ Codetree Taskapp: MySQL Connected');
        return sequelize.sync(); // Sync tables
    })
    .then(() => {
        seedData();
    })
    .catch(err => console.error('❌ MySQL Connection Error:', err));

// --- AUTH ROUTES ---
app.post('/api/auth/login', async (req, res) => {
    try {
        let { username, password } = req.body;
        console.log('--- LOGIN ATTEMPT START ---');
        console.log('Received Payload:', JSON.stringify(req.body));
        
        username = username ? username.trim() : '';
        console.log('Processed Username: [' + username + ']');
        
        if (!username || !password) {
            console.log('❌ Login failed: Missing username or password');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = await Officer.findOne({ where: { username } });

        if (!user) {
            console.log('❌ Login failed: User [' + username + '] NOT found in database.');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('👤 User found:', user.username, 'ID:', user.id);

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('❌ Login failed: Password mismatch for user [' + username + '].');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('✅ Login successful for user [' + username + ']');
        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
        console.log('--- LOGIN ATTEMPT END ---');
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                mustChangePassword: user.mustChangePassword
            }
        });
    } catch (err) {
        console.error('💥 Critical Login error:', err);
        res.status(500).json({ message: 'Server error during login' });
    }
});

app.put('/api/auth/push-token', async (req, res) => {
    try {
        const { userId, pushToken } = req.body;
        console.log(`Syncing push token for user ${userId}: ${pushToken}`);
        await Officer.update({ pushToken }, { where: { id: userId } });
        res.sendStatus(200);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        console.log('Updating password for userId:', userId);
        await Officer.update({
            password: hashedPassword,
            mustChangePassword: false
        }, { where: { id: userId } });
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating password', error: err.message });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await Officer.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'User not found with this email' });
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        await Officer.update({
            password: hashedPassword,
            mustChangePassword: true
        }, { where: { id: user.id } });

        // Send Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Codetree Taskapp: Password Reset Request',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #1E40AF;">Secure Password Reset</h2>
                    <p>Hello <b>${user.name}</b>,</p>
                    <p>We received a request to reset your password. Use the following temporary credentials to login to the Codetree Taskapp:</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><b>Username:</b> ${user.username}</p>
                        <p style="margin: 5px 0;"><b>New Temporary Password:</b> ${tempPassword}</p>
                    </div>
                    <p style="color: #ef4444;"><b>Security Note:</b> You will be required to change this password immediately after logging in.</p>
                    <p>If you did not request this reset, please contact your administrator immediately.</p>
                </div>
            `
        };

        // Send Email in background to prevent UI hang
        transporter.sendMail(mailOptions)
            .then(info => console.log('✅ Reset Email Sent:', info.response))
            .catch(emailErr => console.error('❌ Reset Email Error:', emailErr));

        // Respond immediately to the user
        res.json({ message: 'A new temporary password has been generated and is being sent to your email. Please check your inbox (and spam) in a few moments.' });
    } catch (err) {
        res.status(500).json({ message: 'Error processing request', error: err.message });
    }
});

// --- TASK ROUTES ---
app.get('/api/tasks', async (req, res) => {
    const tasks = await Task.findAll({ order: [['createdAt', 'DESC']] });
    res.json(tasks);
});

// Create Task
app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, assignedTo, assignedToId, assignedToName, priority, suggestedTimeline, createdBy } = req.body;
        const assignedId = parseInt(assignedTo || assignedToId);
        
        const task = await Task.create({
            title, description,
            assignedTo: isNaN(assignedId) ? null : assignedId,
            assignedToName,
            priority,
            suggestedTimeline: suggestedTimeline || 'Within 7 days',
            timeline: [{
                type: 'created',
                user: createdBy || 'Indira Vara Prasad Seerla, MD',
                date: new Date()
            }]
        });

        // Notify Subordinate via App, WhatsApp, SMS, and Email
        if (task.assignedTo) {
            const officer = await Officer.findByPk(task.assignedTo);
            await createNotification(task.assignedTo, 'New Task Assigned 📋', `You have been assigned: ${task.title}`, task.id);
            
            if (officer) {
                const waMsg = `📝 *NEW TASK ASSIGNED*
*ITE&C Department, Govt of AP*

Dear *${officer.name}*, a new task has been assigned to you.

📌 *Title:* ${task.title}
📅 *Deadline:* ${task.suggestedTimeline}
📎 *Priority:* ${task.priority}

Please log in to the Codetree Taskapp to view details.
- Codetree Taskapp`;

                // 1. Send WhatsApp
                if (officer.phoneNumber) sendWhatsApp(officer.phoneNumber, waMsg);

                // 2. Send SMS
                if (officer.phoneNumber) {
                    const smsMsg = `Codetree: New task assigned - ${task.title}. Deadline: ${task.suggestedTimeline}. Check app for details.`;
                    sendSMS(officer.phoneNumber, smsMsg);
                }

                // 3. Send Email
                if (officer.email) {
                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: officer.email,
                        subject: `📝 New Task: ${task.title}`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                <h2 style="color: #1E40AF;">New Task Assigned</h2>
                                <p>Hello <b>${officer.name}</b>,</p>
                                <p>A new task has been assigned to you in the Codetree Taskapp system.</p>
                                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <p><b>Title:</b> ${task.title}</p>
                                    <p><b>Priority:</b> ${task.priority}</p>
                                    <p><b>Deadline:</b> ${task.suggestedTimeline}</p>
                                </div>
                                <p>Please log in to the mobile app to view full details and submit progress.</p>
                            </div>
                        `
                    };
                    transporter.sendMail(mailOptions).catch(e => console.error('Task Email Error:', e.message));
                }
            }
        }

        console.log('✅ Task Created:', task.id, 'for Officer:', task.assignedTo);
        res.status(201).json(task);
    } catch (err) {
        console.error('❌ Create Task Error:', err.message);
        res.status(500).json({ message: 'Error creating task', error: err.message });
    }
});

// Daily Update
app.put('/api/tasks/:id/daily-update', async (req, res) => {
    try {
        const { remark, status, date } = req.body;
        const task = await Task.findByPk(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        task.progressStatus = status;
        if (status === 'Request for Closure') {
            task.status = 'Submitted';
        }

        const updates = task.dailyUpdates || [];
        task.dailyUpdates = [...updates, { remark, status, date, timestamp: new Date() }];
        
        // CRITICAL for Sequelize MySQL JSON updates
        task.changed('dailyUpdates', true);
        
        await task.save();

        const admin = await Officer.findOne({ where: { role: 'MainOfficer' } });
        if (admin) {
            await createNotification(admin.id, 'Daily Update Received 📝', `${task.assignedToName} updated status to ${status}: ${task.title}`, task.id);
            
            if (admin.phoneNumber) {
                const waMsg = `🏛️ *TASK PROGRESS UPDATE*
*ITE&C Department, Govt of AP*

Officer *${task.assignedToName}* has logged a daily update.

📌 *Task:* ${task.title}
🔔 *New Progress:* ${status}
💬 *Remark:* ${remark}

- Codetree Taskapp`;
                sendWhatsApp(admin.phoneNumber, waMsg);
            }
        }

        res.json(task);
    } catch (err) {
        console.error('Daily update error:', err);
        res.status(500).json({ message: 'Error updating task status', error: err.message });
    }
});

// Submit Task
app.put('/api/tasks/:id/submit', async (req, res) => {
    const { user } = req.body;
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    task.status = 'Submitted';
    const timeline = task.timeline || [];
    task.timeline = [...timeline, { type: 'submitted', user, date: new Date() }];
    await task.save();

    const admin = await Officer.findOne({ where: { role: 'MainOfficer' } });
    if (admin) {
        await createNotification(admin.id, 'Task Submitted 🚀', `${task.assignedToName} submitted: ${task.title}`, task.id);
        
        if (admin.phoneNumber) {
            const waMsg = `🏛️ *TASK SUBMITTED FOR REVIEW*
*ITE&C Department, Govt of AP*

Officer *${task.assignedToName}* has officially submitted their task for review.

📌 *Task:* ${task.title}
💬 *Status:* Ready for Inspection

Please visit the dashboard to review the submission.
- Codetree Taskapp`;
            sendWhatsApp(admin.phoneNumber, waMsg);
        }
    }

    res.json(task);
});

// Reopen Task
app.put('/api/tasks/:id/reopen', async (req, res) => {
    const { user, reason, newOfficerId, newOfficerName, adminRemarks } = req.body;
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    task.status = 'Open';
    const timeline = task.timeline || [];
    task.timeline = [...timeline, { type: 'reopened', user, reason, date: new Date() }];
    if (newOfficerId) {
        task.assignedTo = newOfficerId;
        task.assignedToName = newOfficerName;
    }
    if (adminRemarks) {
        task.adminRemarks = adminRemarks;
    }
    await task.save();

    await createNotification(task.assignedTo, 'Task Reopened ⚠️', `Further action required on: ${task.title}`, task.id);
    
    const officer = await Officer.findByPk(task.assignedTo);
    if (officer) {
        const waMsg = `⚠️ *TASK REOPENED*
*ITE&C Department, Govt of AP*

Dear *${officer.name}*, your task has been reopened for revisions.

📌 *Task:* ${task.title}
💬 *Reason:* ${reason || adminRemarks || 'Action required'}

Please check the app for further instructions.
- Codetree Taskapp`;

        // 1. WhatsApp
        if (officer.phoneNumber) sendWhatsApp(officer.phoneNumber, waMsg);

        // 2. SMS
        if (officer.phoneNumber) {
            sendSMS(officer.phoneNumber, `Codetree: Task Reopened - ${task.title}. Reason: ${reason || adminRemarks || 'Action required'}.`);
        }

        // 3. Email
        if (officer.email) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: officer.email,
                subject: `⚠️ Task Action Required: ${task.title}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #fee2e2; border-radius: 10px;">
                        <h2 style="color: #b91c1c;">Task Reopened</h2>
                        <p>Hello <b>${officer.name}</b>,</p>
                        <p>Your task has been reopened for further action/revisions.</p>
                        <hr style="border: none; border-top: 1px solid #fecaca; margin: 20px 0;">
                        <p><b>Task:</b> ${task.title}</p>
                        <p><b>Reason for Revision:</b> ${reason || adminRemarks || 'Please see app details.'}</p>
                        <p>Please log in to the Codetree Taskapp to address the feedback.</p>
                    </div>
                `
            };
            transporter.sendMail(mailOptions).catch(e => console.error('Reopen Email Error:', e.message));
        }
    }

    res.json(task);
});

// Close Task
app.put('/api/tasks/:id/close', async (req, res) => {
    const { user, closingRemark, adminRemarks } = req.body;
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    task.status = 'Closed';
    const timeline = task.timeline || [];
    task.timeline = [...timeline, { type: 'closed', user, closingRemark, date: new Date() }];

    if (adminRemarks) {
        task.adminRemarks = adminRemarks;
    } else if (closingRemark) {
        task.adminRemarks = closingRemark;
    }
    await task.save();

    await createNotification(task.assignedTo, 'Task Completed 🏆', `Great work! ${task.title} has been officially closed.`, task.id);

    const officer = await Officer.findByPk(task.assignedTo);
    if (officer) {
        const waMsg = `🏆 *TASK COMPLETED & CLOSED*
*ITE&C Department, Govt of AP*

Dear *${officer.name}*, your task has been officially closed.

📌 *Task:* ${task.title}
💬 *Remark:* ${closingRemark || 'Mission accomplished.'}

Great work on completing this objective!
- Codetree Taskapp`;

        // 1. WhatsApp
        if (officer.phoneNumber) sendWhatsApp(officer.phoneNumber, waMsg);

        // 2. SMS
        if (officer.phoneNumber) {
            sendSMS(officer.phoneNumber, `Codetree: Task Completed - ${task.title}. Great work!`);
        }

        // 3. Email
        if (officer.email) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: officer.email,
                subject: `🏆 Task Finalized: ${task.title}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #065f46; border-radius: 10px; background: #ecfdf5;">
                        <h2 style="color: #047857;">Task Successfully Closed</h2>
                        <p>Hello <b>${officer.name}</b>,</p>
                        <p>Congratulations! Your task has been reviewed and officially marked as <b>Closed</b>.</p>
                        <div style="background: #ffffff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #a7f3d0;">
                            <p><b>Task:</b> ${task.title}</p>
                            <p><b>Closing Remark:</b> ${closingRemark || 'Mission accomplished.'}</p>
                        </div>
                        <p>Thank you for your dedication to the department's objectives.</p>
                    </div>
                `
            };
            transporter.sendMail(mailOptions).catch(e => console.error('Close Email Error:', e.message));
        }
    }
    res.json(task);
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { _id, id, ...updateData } = req.body; // Prevent updating primary keys
        const taskId = parseInt(req.params.id);
        
        if (isNaN(taskId)) return res.status(400).json({ message: 'Invalid Task ID' });

        const task = await Task.findByPk(taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Update standard fields
        for (const key in updateData) {
            if (updateData[key] !== undefined) task[key] = updateData[key];
        }

        // Handle specific logic for status/remarks/timeline
        if (updateData.adminRemarks || updateData.progressStatus || updateData.status) {
            const timeline = task.timeline || [];
            task.timeline = [...timeline, {
                type: 'admin_response',
                user: 'Indira Vara Prasad Seerla, MD',
                remark: updateData.adminRemarks || 'Instruction updated',
                status: updateData.status || task.status,
                progress: updateData.progressStatus || task.progressStatus,
                date: new Date()
            }];
            task.changed('timeline', true);
            
            // Notify Subordinate if status/progress changed
            if (updateData.progressStatus || updateData.status) {
                await createNotification(task.assignedTo, 'Task Updated by Admin 🔔', `Update on: ${task.title}`, task.id);
            }
        }
        
        if (updateData.dailyUpdates) task.changed('dailyUpdates', true);

        await task.save();
        console.log('✅ Task Updated:', task.id, 'Status:', task.status);
        res.json(task);
    } catch (err) {
        console.error('Update task error:', err);
        res.status(500).json({ message: 'Error updating task', error: err.message });
    }
});

// --- OFFICER ROUTES ---
app.get('/api/officers', async (req, res) => {
    const officers = await Officer.findAll({ where: { role: 'Officer' } });
    res.json(officers);
});

app.post('/api/officers', async (req, res) => {
    try {
        const { name, designation, email, phoneNumber } = req.body;
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const username = phoneNumber;

        const officer = await Officer.create({
            username,
            password: hashedPassword,
            name,
            designation,
            email,
            phoneNumber,
            role: 'Officer',
            mustChangePassword: true
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Codetree Taskapp Login Details',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #1E40AF;">Welcome to Codetree Taskapp</h2>
                    <p>Hello <b>${name}</b>,</p>
                    <p>Your officer profile has been created. Use the following credentials to login to the mobile app:</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><b>Username:</b> ${username}</p>
                        <p style="margin: 5px 0;"><b>Temporary Password:</b> ${tempPassword}</p>
                    </div>
                </div>
            `
        };

        transporter.sendMail(mailOptions)
            .then(info => console.log('✅ Officer Creation Email Sent:', info.response))
            .catch(emailErr => console.error('❌ Officer Creation Email Error:', emailErr));

        res.status(201).json(officer);
    } catch (err) {
        res.status(400).json({ message: 'Error creating officer', error: err.message });
    }
});

// --- NOTIFICATION ROUTES ---
app.get('/api/notifications/:userId', async (req, res) => {
    const notes = await Notification.findAll({ where: { recipient: req.params.userId, isRead: false }, order: [['createdAt', 'DESC']] });
    res.json(notes);
});

app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        const idParam = req.params.id;
        
        // Safety check for invalid or "undefined" strings from frontend
        if (!idParam || idParam === 'undefined' || idParam === 'null') {
            return res.status(400).json({ message: 'Missing or invalid notification ID' });
        }

        const noteId = parseInt(idParam);
        
        if (isNaN(noteId)) {
            // If it's not a number, check if it looks like a MongoDB ObjectId string (24 chars hex)
            // or just try to update by string if it's potentially an old ID.
            // But if it's not numeric and we are in MySQL, we must be careful.
            if (idParam.length === 24) {
                 await Notification.update({ isRead: true }, { where: { id: idParam } });
            } else {
                return res.status(400).json({ message: 'Invalid non-numeric ID' });
            }
        } else {
            await Notification.update({ isRead: true }, { where: { id: noteId } });
        }
        
        res.sendStatus(200);
    } catch (err) {
        console.error('Mark read error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- APPOINTMENT ROUTES ---
const otpStore = new Map();

app.post('/api/public/appointments/send-otp', async (req, res) => {
    try {
        const { email, mobile, name } = req.body;
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 });

        // --- Email OTP ---
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Codetree Taskapp: Appointment Verification OTP',
            html: `<p>Dear <b>${name || 'User'}</b>,</p><p>Your verification code is: <b>${otp}</b></p>`
        };

        transporter.sendMail(mailOptions)
            .then(() => console.log(`✅ OTP Email Sent to ${email}`))
            .catch(err => console.error('❌ OTP Email Error:', err.message));

        // --- SMS OTP ---
        if (mobile) {
            const otpMsg = `Dear ${name || 'User'}, ${otp} is your one-time password to Registration - GOVTAP`;
            sendSMS(mobile, otpMsg)
                .then(success => console.log(`✅ OTP SMS result: ${success}`))
                .catch(err => console.error(`❌ OTP SMS Error: ${err.message}`));
                
            // --- WhatsApp OTP ---
            sendWhatsApp(mobile, otpMsg)
                .then(success => console.log(`✅ OTP WhatsApp result: ${success}`))
                .catch(err => console.error(`❌ OTP WhatsApp Error: ${err.message}`));
        }

        res.json({ message: 'Verification code sent to Email and Mobile.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to process OTP request' });
    }
});

app.post('/api/public/appointments', upload.single('idProof'), async (req, res) => {
    try {
        const body = req.body;
        const { email, otp } = body;

        // OTP bypass (enable strict check when SMS balance is restored)
        const isValid = true;
        if (!isValid) return res.status(400).json({ message: 'Invalid or expired OTP' });
        otpStore.delete(email);

        const appointment = await Appointment.create({
            name:        body.name        || '',
            email:       email            || '',
            mobile:      body.mobile      || '',
            subject:     body.subject     || '',
            date:        body.date        || '',
            idProofType: body.idProofType || '1',
            idNumber:    body.idNumber    || '',
            noOfPersons: parseInt(body.noOfPersons, 10) || 1,
            visitorType: body.visitorType || 'Official',
            vehicleNo:   body.vehicleNo   || '',
            status:      'Pending',
            time:        'Slot Pending',
            idProofUrl:  req.file ? `/uploads/idproofs/${req.file.filename}` : null
        });

        res.status(201).json(appointment);
    } catch (err) {
        console.error('❌ Appointment create error:', err.message);
        res.status(400).json({ message: 'Error booking slot', error: err.message });
    }
});

// Serve uploaded files statically
app.use('/uploads', require('express').static(path.join(__dirname, 'uploads')));

app.get('/api/appointments', async (req, res) => {
    try {
        const appointments = await Appointment.findAll({ order: [['createdAt', 'DESC']] });
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching appointments' });
    }
});
app.get('/api/appointments/slots', async (req, res) => {
    const { date } = req.query;
    const bookedAppointments = await Appointment.findAll({ where: { date, status: 'Scheduled' } });
    const bookedTimes = bookedAppointments.map(a => a.time);
    
    // Correct order: baseHour=16 (4 PM), count=10 slots, duration=5 mins, gap=1 min
    const availableSlots = generateSlots(16, 10, 5, 1).filter(s => !bookedTimes.includes(s));
    res.json(availableSlots);
});

const { google } = require('googleapis');
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
);

if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function createCalendarEvent(appointment) {
    const startTime = new Date(`${appointment.date} ${appointment.time}`);
    const endTime = new Date(startTime.getTime() + 5 * 60 * 1000);
    const event = {
        summary: `Appointment: ${appointment.name}`,
        description: `Subject: ${appointment.subject}`,
        start: { dateTime: startTime.toISOString(), timeZone: 'Asia/Kolkata' },
        end: { dateTime: endTime.toISOString(), timeZone: 'Asia/Kolkata' },
        attendees: [{ email: appointment.email }],
        conferenceData: { createRequest: { requestId: `appt-${appointment.id}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    };
    try {
        const response = await calendar.events.insert({ calendarId: 'primary', resource: event, conferenceDataVersion: 1 });
        return response.data.hangoutLink;
    } catch (err) {
        return `https://meet.google.com/fallback`;
    }
}

const QRCode = require('qrcode');

app.put('/api/appointments/:id/status', async (req, res) => {
    try {
        const { status, time } = req.body;
        const appointment = await Appointment.findByPk(req.params.id);
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        const update = { status };
        if (time) update.time = time;

        if (status === 'Scheduled') {
            const meetLink = await createCalendarEvent({ ...appointment.toJSON(), time: time || appointment.time });
            update.meetLink = meetLink;
            Object.assign(appointment, update);
            await appointment.save();

            // --- Submit Gate Pass ---
            const gatePassId = await submitGatePass(appointment.toJSON());
            if (gatePassId) {
                await appointment.update({ gatePassId: String(gatePassId) });
                await appointment.reload();
            }

            // QR Code for the Gate Pass — encodes the visitor ID for scanner at gate
            let gatePassQrImage = null;
            if (gatePassId) {
                gatePassQrImage = await QRCode.toDataURL(String(gatePassId));
                // Also save to disk for external use/WhatsApp
                try {
                    const qrPath = path.join(qrCodesDir, `qr-${appointment.id}.png`);
                    const base64Data = gatePassQrImage.replace(/^data:image\/png;base64,/, "");
                    fs.writeFileSync(qrPath, base64Data, 'base64');
                } catch (qrErr) {
                    console.error('❌ QR save error:', qrErr.message);
                }
            }

            // Appointment summary QR (full details)
            const qrData = JSON.stringify({ id: appointment.id, name: appointment.name, date: appointment.date, time: appointment.time, gatePassId: gatePassId || 'N/A' });
            const qrImage = await QRCode.toDataURL(qrData);

            const idProofLine = appointment.idProofUrl
                ? `<p><b>ID Proof submitted:</b> ✅ On file</p>`
                : '';

            const gatePassLine = gatePassId
                ? `<div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:8px;padding:16px;margin:12px 0;text-align:center;">
                    <p style="margin:0;font-size:1rem;text-align:left;"><b>🎫 Gate Pass Issued</b></p>
                    <p style="margin:4px 0 8px;font-size:1.4rem;font-weight:bold;color:#16a34a;text-align:left;">Visitor ID: ${gatePassId}</p>
                    <img src="${gatePassQrImage}" alt="Gate Pass QR" style="width:160px;height:160px;display:block;margin:8px auto;border:4px solid #22c55e;border-radius:8px;">
                    <p style="margin:8px 0 0;font-size:0.8rem;color:#666;">Show this QR Code at the security gate for entry.</p>
                  </div>`
                : `<p style="color:orange;"><b>⚠️ Gate pass could not be issued automatically. Please contact the office.</b></p>`;

            // --- Send Email ---
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: appointment.email,
                subject: `OFFICIAL: Appointment Confirmation - ITE&C Department, AP`,
                html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);max-width:600px;">

        <!-- TOP LABEL -->
        <tr><td style="background:#1a237e;padding:10px 24px;">
          <p style="margin:0;color:#90caf9;font-size:11px;letter-spacing:1px;text-transform:uppercase;">🔒 OFFICIAL: Appointment Confirmation — ITE&amp;C Department, AP</p>
        </td></tr>

        <!-- HEADER BANNER -->
        <tr><td style="background:linear-gradient(135deg,#1565c0 0%,#0d47a1 100%);padding:28px 24px 20px;">
          <p style="margin:0 0 6px;color:#90caf9;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Government of Andhra Pradesh</p>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">✅ APPOINTMENT CONFIRMED</h1>
          <p style="margin:6px 0 0;color:#bbdefb;font-size:13px;">Information Technology, Electronics &amp; Communications Department</p>
        </td></tr>

        <!-- BODY -->
        <tr><td style="padding:28px 24px;">

          <p style="margin:0 0 18px;color:#1a237e;font-size:15px;">Dear <strong>${appointment.name}</strong>,</p>
          <p style="margin:0 0 22px;color:#444;font-size:14px;line-height:1.7;">
            Your request for an appointment with the <strong>Hon'ble Secretary</strong> has been approved. Please find the formal details below:
          </p>

          <!-- APPOINTMENT DETAILS TABLE -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e8f0;border-radius:8px;overflow:hidden;margin-bottom:22px;">
            <tr style="background:#e8eaf6;">
              <td colspan="2" style="padding:10px 16px;color:#1a237e;font-size:12px;letter-spacing:1px;font-weight:700;text-transform:uppercase;">Appointment Details</td>
            </tr>
            <tr>
              <td style="padding:11px 16px;color:#666;font-size:13px;border-top:1px solid #eee;width:38%;">📅 Date</td>
              <td style="padding:11px 16px;color:#1a237e;font-weight:700;font-size:14px;border-top:1px solid #eee;">${appointment.date}</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:11px 16px;color:#666;font-size:13px;border-top:1px solid #eee;">🕐 Slot Time</td>
              <td style="padding:11px 16px;color:#1a237e;font-weight:700;font-size:14px;border-top:1px solid #eee;">${appointment.time}</td>
            </tr>
            <tr>
              <td style="padding:11px 16px;color:#666;font-size:13px;border-top:1px solid #eee;">⏱ Duration</td>
              <td style="padding:11px 16px;color:#333;font-size:13px;border-top:1px solid #eee;">5 Minutes</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:11px 16px;color:#666;font-size:13px;border-top:1px solid #eee;vertical-align:top;">📋 Purpose</td>
              <td style="padding:11px 16px;color:#333;font-size:13px;border-top:1px solid #eee;line-height:1.6;">${appointment.subject}</td>
            </tr>
          </table>

          <!-- PHYSICAL LOCATION -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e8f0;border-radius:8px;overflow:hidden;margin-bottom:22px;">
            <tr style="background:#e8eaf6;">
              <td style="padding:10px 16px;color:#1a237e;font-size:12px;letter-spacing:1px;font-weight:700;text-transform:uppercase;">📍 Physical Location</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;color:#333;font-size:14px;line-height:1.8;">
                <strong>Room No: 269, 4th Block, 1st Floor</strong><br>
                A.P Secretariat, Velagapudi<br>
                <a href="https://maps.google.com/?q=AP+Secretariat+Velagapudi+Amaravati" style="color:#1565c0;font-size:13px;text-decoration:none;" target="_blank">🗺️ View on Google Maps</a>
              </td>
            </tr>
          </table>

          <!-- VIRTUAL MEETING LINK -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e8f0;border-radius:8px;overflow:hidden;margin-bottom:22px;">
            <tr style="background:#e8eaf6;">
              <td style="padding:10px 16px;color:#1a237e;font-size:12px;letter-spacing:1px;font-weight:700;text-transform:uppercase;">🎥 Virtual Meeting Link</td>
            </tr>
            <tr>
              <td style="padding:16px;text-align:center;">
                <a href="${meetLink}" style="display:inline-block;background:#1565c0;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:0.5px;" target="_blank">📹 JOIN GOOGLE MEET</a>
                <p style="margin:10px 0 0;font-size:12px;color:#999;word-break:break-all;">${meetLink}</p>
              </td>
            </tr>
          </table>

          <!-- GATE PASS / ENTRY QR CODE -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${gatePassId ? '#22c55e' : '#f59e0b'};border-radius:8px;overflow:hidden;margin-bottom:22px;">
            <tr style="background:${gatePassId ? '#f0fdf4' : '#fffbeb'};">
              <td style="padding:10px 16px;color:${gatePassId ? '#166534' : '#92400e'};font-size:12px;letter-spacing:1px;font-weight:700;text-transform:uppercase;">🎫 Entry QR Code${gatePassId ? ' — Gate Pass Issued' : ' — Pending'}</td>
            </tr>
            <tr>
              <td style="padding:20px;text-align:center;">
                ${gatePassId ? `
                <p style="margin:0 0 4px;font-size:13px;color:#166534;"><strong>Visitor ID: ${gatePassId}</strong></p>
                <img src="${gatePassQrImage}" alt="Entry QR" style="width:180px;height:180px;display:block;margin:12px auto;border:3px solid #22c55e;border-radius:8px;padding:6px;background:#fff;">
                <p style="margin:8px 0 0;font-size:12px;color:#555;">Please show this QR code at the Secretariat entrance.</p>
                ` : `<p style="color:#b45309;font-size:13px;">⚠️ Gate pass could not be issued automatically. Please contact the office.</p>`}
              </td>
            </tr>
          </table>

          <!-- MANDATORY WARNING -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #f59e0b;background:#fffbeb;border-radius:0 6px 6px 0;margin-bottom:22px;">
            <tr>
              <td style="padding:12px 16px;color:#92400e;font-size:13px;font-weight:600;">
                ⚠️ MANDATORY: Please report at the location <u>30 Minutes before</u> your scheduled slot for security clearance.
              </td>
            </tr>
          </table>

          <!-- BOOKING URL -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
            <tr>
              <td align="center" style="padding:10px;border-top:1px solid #eee;">
                <p style="margin:0 0 10px;color:#666;font-size:12px;">Need another appointment?</p>
                <a href="https://codetree.ctapps.in" style="font-size:13px;color:#1565c0;text-decoration:none;font-weight:600;">🌐 codetree.ctapps.in</a>
              </td>
            </tr>
          </table>

        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#1a237e;padding:18px 24px;text-align:center;">
          <p style="margin:0 0 4px;color:#bbdefb;font-size:11px;">This is a system-generated official communication. No signature is required.</p>
          <p style="margin:0;color:#7986cb;font-size:11px;letter-spacing:1px;">Government of Andhra Pradesh • Official Meeting Portal • NEXUS</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
            };
            transporter.sendMail(mailOptions)
                .then(() => console.log('✅ Confirmation email sent to', appointment.email))
                .catch(err => console.error('❌ Email failed:', err.message));

            // --- Send SMS & WhatsApp ---
            const googleMapsUrl = 'https://maps.app.goo.gl/secretariat_location'; // Placeholder: Replace with actual
            const finalMeetLink = appointment.meetLink || meetLink || 'N/A';
            const location = 'Room No: 269, 4th Block, 1st Floor, A.P Secretariat, Velagapudi';
            const qrPublicUrl = gatePassId ? `https://codetree.ctapps.in/uploads/qrcodes/qr-${appointment.id}.png` : null;
            
            const waMsg = `🏛️ *APPOINTMENT CONFIRMED*
*ITE&C Department, Govt of AP*

Dear *${appointment.name}*,
Your appointment is confirmed.

📅 *Date:* ${appointment.date}
🕐 *Slot Time:* ${appointment.time}
⏱ *Duration:* 5 Minutes
🎫 *Gate Pass ID:* ${gatePassId || 'N/A'}

📍 *Physical Location:*
${location}
🌐 *Map:* ${googleMapsUrl}

💻 *Virtual Meeting:*
${finalMeetLink}

${qrPublicUrl ? `🎫 *Entry QR:* ${qrPublicUrl}\n` : ''}
📅 *Book Future Appointments:*
https://codetree.ctapps.in

⚠️ *MANDATORY:* Please report 30 minutes before your scheduled slot for security clearance.

- Codetree Taskapp`;

            const smsSent = await sendSMS(appointment.mobile, `Your appointment at ITE&C Dept is confirmed. Date: ${appointment.date}, Time: ${appointment.time}. Gate Pass: ${gatePassId}. Location: Room 269, AP Secretariat.`);
            const waSent = await sendWhatsApp(appointment.mobile, waMsg);
            await appointment.update({ smsStatus: smsSent || waSent ? 'Sent' : 'Failed' });

            return res.json(appointment);
        } else {
            Object.assign(appointment, update);
            await appointment.save();
            return res.json(appointment);
        }
    } catch (err) {
        res.status(500).json({ message: 'Error updating appointment' });
    }
});

app.put('/api/officers/:id', async (req, res) => {
    try {
        const { name, designation, email, phoneNumber } = req.body;
        const officer = await Officer.findByPk(req.params.id);
        if (!officer) return res.status(404).json({ message: 'Officer not found' });
        Object.assign(officer, { name, designation, email, phoneNumber });
        await officer.save();
        res.json(officer);
    } catch (err) {
        res.status(400).json({ message: 'Error updating officer' });
    }
});

app.delete('/api/officers/:id', async (req, res) => {
    try {
        await Officer.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Officer deleted successfully' });
    } catch (err) {
        console.error('Delete officer error:', err);
        res.status(500).json({ message: 'Error deleting officer', error: err.message });
    }
});

// --- DEBUG ROUTES ---
app.get('/api/debug/email-status', async (req, res) => {
    try {
        await transporter.verify();
        res.json({ status: '✅ SMTP Transporter is READY' });
    } catch (err) {
        res.status(500).json({ status: '❌ SMTP Transporter ERROR', error: err.message });
    }
});

function generateSlots(baseHour = 16, count = 10, duration = 5, gap = 1) {
    const slots = [];
    const date = new Date();
    date.setHours(baseHour, 0, 0, 0);
    for (let i = 0; i < count; i++) {
        const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        slots.push(time);
        date.setMinutes(date.getMinutes() + duration + gap);
    }
    return slots;
}

async function seedData() {
    const count = await Officer.count();
    if (count === 0) {
        const hashedPassword = await bcrypt.hash('Codetree@2026!', 10);
        await Officer.create({
            username: 'admin', password: hashedPassword, name: 'Indira Vara Prasad Seerla, MD',
            email: 'admin@codetree.com', phoneNumber: '0000000000', designation: 'Principal Secretary',
            role: 'MainOfficer', mustChangePassword: false
        });
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Codetree Taskapp Backend running on port ${PORT}`);
});

module.exports = app;
