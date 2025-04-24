const bcrypt = require('bcrypt');

const hashPassword = async (plainPassword) => {
    try {
        const saltRounds = 10; // Recommended number of salt rounds
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
        console.log(`Hashed Password: ${hashedPassword}`);
    } catch (error) {
        console.error('Error hashing password:', error);
    }
};

// Replace "your_password_here" with the actual password you want to hash
hashPassword("bookly@6136");
