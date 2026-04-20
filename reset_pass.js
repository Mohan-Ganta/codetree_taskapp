const { Officer } = require('./models');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('password', 10);
        const [updated] = await Officer.update(
            { password: hashedPassword },
            { where: { username: 'admin' } }
        );
        console.log(`Admin password reset status: ${updated}`);

        const ganeshPassword = await bcrypt.hash('123456', 10);
        const [updatedG] = await Officer.update(
            { password: ganeshPassword },
            { where: { username: 'dattiganesh341' } }
        );
        console.log(`Ganesh password reset status: ${updatedG}`);
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

resetAdmin();
