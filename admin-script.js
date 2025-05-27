document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const adminDashboard = document.getElementById('admin-dashboard');
    const adminUsernameInput = document.getElementById('adminUsername');
    const adminPasswordInput = document.getElementById('adminPassword');
    const loginBtn = document.getElementById('loginBtn');
    const loginMessage = document.getElementById('loginMessage');
    const reservationsTableBody = document.querySelector('#reservationsTable tbody');
    const userCodesList = document.getElementById('userCodesList');
    const newUserCodeInput = document.getElementById('newUserCode');
    const addUserBtn = document.getElementById('addUserBtn');
    const userMessage = document.getElementById('userMessage');

    // Hardcoded admin credentials (for frontend prompt only)
    const ADMIN_USERNAME = 'ali';
    const ADMIN_PASSWORD = 'bahadir';

    // --- API Functions ---
    async function fetchReservations() {
        try {
            const response = await fetch('/reservations');
            if (!response.ok) {
                throw new Error('Rezervasyonlar çekilemedi.');
            }
            return await response.json();
        } catch (error) {
            console.error('Rezervasyonları çekerken hata:', error);
            return [];
        }
    }

    async function fetchUsers() {
        try {
            const response = await fetch('/users');
            if (!response.ok) {
                throw new Error('Kullanıcılar çekilemedi.');
            }
            return await response.json();
        } catch (error) {
            console.error('Kullanıcıları çekerken hata:', error);
            return [];
        }
    }

    async function addUser(code) {
        try {
            const response = await fetch('/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Kullanıcı eklenirken hata oluştu.');
            }
            return { success: true, message: data.message };
        } catch (error) {
            console.error('Kullanıcı eklenirken hata:', error);
            return { success: false, message: error.message || 'Bir hata oluştu.' };
        }
    }

    async function deleteUser(code) {
        try {
            const response = await fetch(`/users/${code}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Kullanıcı silinirken hata oluştu.');
            }
            return { success: true, message: data.message };
        } catch (error) {
            console.error('Kullanıcı silinirken hata:', error);
            return { success: false, message: error.message || 'Bir hata oluştu.' };
        }
    }

    // --- Render Functions ---
    async function renderReservations() {
        reservationsTableBody.innerHTML = '';
        const reservations = await fetchReservations();
        if (reservations.length === 0) {
            const row = reservationsTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 3;
            cell.textContent = 'Henüz hiç rezervasyon yok.';
            cell.style.textAlign = 'center';
            cell.style.padding = '20px';
            return;
        }
        reservations.forEach(res => {
            const row = reservationsTableBody.insertRow();
            row.insertCell().textContent = new Date(res.date).toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            row.insertCell().textContent = res.time;
            row.insertCell().textContent = res.userCode;
        });
    }

    async function renderUserCodes() {
        userCodesList.innerHTML = '';
        const users = await fetchUsers();
        if (users.length === 0) {
            const listItem = document.createElement('li');
            listItem.textContent = 'Henüz hiç kullanıcı kodu yok.';
            userCodesList.appendChild(listItem);
            return;
        }
        users.forEach(code => {
            const listItem = document.createElement('li');
            listItem.textContent = code;
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Sil';
            deleteBtn.addEventListener('click', async () => {
                const confirmDelete = confirm(`Kullanıcı kodu ${code} silinsin mi?`);
                if (confirmDelete) {
                    const result = await deleteUser(code);
                    if (result.success) {
                        displayUserMessage(result.message, 'success');
                        renderUserCodes(); // Re-render list
                    } else {
                        displayUserMessage(result.message, 'error');
                    }
                }
            });
            listItem.appendChild(deleteBtn);
            userCodesList.appendChild(listItem);
        });
    }

    function displayLoginMessage(message, type) {
        loginMessage.textContent = message;
        loginMessage.className = `message ${type}`;
    }

    function displayUserMessage(message, type) {
        userMessage.textContent = message;
        userMessage.className = `message ${type}`;
        setTimeout(() => {
            userMessage.textContent = '';
            userMessage.classList.remove(type);
        }, 3000);
    }

    // --- Event Listeners ---
    loginBtn.addEventListener('click', () => {
        const username = adminUsernameInput.value;
        const password = adminPasswordInput.value;

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            loginSection.style.display = 'none';
            adminDashboard.style.display = 'block';
            renderReservations();
            renderUserCodes();
        } else {
            displayLoginMessage('Geçersiz kullanıcı adı veya şifre.', 'error');
        }
    });

    addUserBtn.addEventListener('click', async () => {
        const newCode = newUserCodeInput.value;
        if (!newCode || !/^\d{6}$/.test(newCode)) {
            displayUserMessage('Lütfen 6 haneli geçerli bir kullanıcı kodu girin.', 'error');
            return;
        }

        const result = await addUser(newCode);
        if (result.success) {
            displayUserMessage(result.message, 'success');
            newUserCodeInput.value = ''; // Clear input
            renderUserCodes(); // Re-render list
        } else {
            displayUserMessage(result.message, 'error');
        }
    });
});
