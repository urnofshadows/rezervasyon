const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files from the current directory

const USERS_FILE = 'users.json';
const RESERVATIONS_FILE = 'reservations.json';

// Helper function to read JSON files
const readJsonFile = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return [];
    }
};

// Helper function to write JSON files
const writeJsonFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
    }
};

// API Endpoints

// GET /users
app.get('/users', (req, res) => {
    const users = readJsonFile(USERS_FILE);
    res.json(users);
});

// POST /users
app.post('/users', (req, res) => {
    const { code } = req.body;
    if (!code || typeof code !== 'string' || !/^[a-zA-Z0-9]{6}$/.test(code)) {
        return res.status(400).json({ message: 'Geçersiz kullanıcı kodu. 6 karakterli (harf ve/veya sayı) olmalıdır.' });
    }

    const users = readJsonFile(USERS_FILE);
    if (users.includes(code)) {
        return res.status(409).json({ message: 'Bu kullanıcı kodu zaten mevcut.' });
    }

    users.push(code);
    writeJsonFile(USERS_FILE, users);
    res.status(201).json({ message: 'Kullanıcı kodu başarıyla eklendi.', users });
});

// DELETE /users/:code
app.delete('/users/:code', (req, res) => {
    const { code } = req.params;
    let users = readJsonFile(USERS_FILE);
    const initialLength = users.length;
    users = users.filter(userCode => userCode !== code);

    if (users.length === initialLength) {
        return res.status(404).json({ message: 'Kullanıcı kodu bulunamadı.' });
    }

    writeJsonFile(USERS_FILE, users);
    res.status(200).json({ message: 'Kullanıcı kodu başarıyla silindi.', users });
});


// GET /reservations
app.get('/reservations', (req, res) => {
    const reservations = readJsonFile(RESERVATIONS_FILE);
    res.json(reservations);
});

// POST /reservations
app.post('/reservations', (req, res) => {
    const { date, time, userCode } = req.body;

    // Basic validation
    if (!date || !time || !userCode) {
        return res.status(400).json({ message: 'Tarih, saat ve kullanıcı kodu gerekli.' });
    }
    if (typeof userCode !== 'string' || !/^\d{6}$/.test(userCode)) {
        return res.status(400).json({ message: 'Geçersiz kullanıcı kodu formatı. 6 haneli bir sayı olmalıdır.' });
    }

    // Server-side date validation: Prevent reservations for past dates
    const reservationDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to start of day for comparison
    reservationDate.setHours(0, 0, 0, 0); // Normalize reservationDate to start of day

    if (reservationDate < today) {
        return res.status(400).json({ message: 'Geçmiş bir tarih için rezervasyon yapılamaz.' });
    }

    const users = readJsonFile(USERS_FILE);
    if (!users.includes(userCode)) {
        return res.status(401).json({ message: 'Geçersiz kullanıcı kodu.' });
    }

    const reservations = readJsonFile(RESERVATIONS_FILE);

    // Check for existing reservation at the same date and time
    const existingReservation = reservations.find(
        (r) => r.date === date && r.time === time
    );

    if (existingReservation) {
        return res.status(409).json({ message: 'Bu saat dilimi zaten rezerve edilmiş.' });
    }

    const newReservation = { date, time, userCode };
    reservations.push(newReservation);
    writeJsonFile(RESERVATIONS_FILE, reservations);
    res.status(201).json({ message: 'Rezervasyon başarıyla oluşturuldu.', reservation: newReservation });
});

app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor.`);
});
