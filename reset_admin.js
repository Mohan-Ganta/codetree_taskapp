require('dotenv').config();
const { Officer } = require('./models');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    try {
        const strongPassword = 'Codetree@2026!';
        const hashedPassword = await bcrypt.hash(strongPassword, 10);
        
        const [updated] = await Officer.update(
            { password: hashedPassword },
            { where: { username: 'admin' } }
        );

        if (updated) {
            console.log('\n✅ Admin password updated successfully!');
            console.log('------------------------------------');
            console.log('Username: admin');
            console.log('New Password:', strongPassword);
            console.log('------------------------------------\n');
        } else {
            console.log('\n❌ Could not find an account with username "admin".');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error updating password:', err.message);
        process.exit(1);
    }
}

resetAdmin();
