const { Officer } = require('./models');
const bcrypt = require('bcryptjs');

async function checkUsers() {
    try {
        const users = await Officer.findAll();
        console.log('--- Current Users in Database ---');
        for (const user of users) {
             console.log(`Username: ${user.username}, Role: ${user.role}, Name: ${user.name}`);
             // Test if 'password' is the password for 'admin'
             if (user.username === 'admin') {
                 const isPassMatch = await bcrypt.compare('password', user.password);
                 console.log(`- Password "password" matches for admin? ${isPassMatch}`);
             }
             if (user.username === 'dattiganesh341') {
                 const isPassMatch = await bcrypt.compare('123456', user.password);
                 console.log(`- Password "123456" matches for dattiganesh341? ${isPassMatch}`);
             }
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUsers();
