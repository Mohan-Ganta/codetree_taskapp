require('dotenv').config();
const { Officer } = require('./models');

async function checkPasswordStatus() {
    try {
        const users = await Officer.findAll();
        
        const changed = users.filter(u => u.mustChangePassword === false);
        const notChanged = users.filter(u => u.mustChangePassword === true);

        console.log('\n--- PASSWORD CHANGE STATUS REPORT ---');
        console.log(`Total Users: ${users.length}`);
        console.log(`Users who CHANGED password: ${changed.length}`);
        console.log(`Users who have NOT changed: ${notChanged.length}`);
        console.log('-------------------------------------\n');

        if (changed.length > 0) {
            console.log('Users who changed their passwords:');
            changed.forEach(u => {
                console.log(`- ${u.name} (@${u.username}) [Role: ${u.role}]`);
            });
        } else {
            console.log('No users have changed their passwords yet.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error checking status:', err);
        process.exit(1);
    }
}

checkPasswordStatus();
