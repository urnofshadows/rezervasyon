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

    // Edit Reservation Modal Elements
    const editReservationModal = document.getElementById('editReservationModal');
    const closeModalEditBtn = editReservationModal.querySelector('.close-button-edit');
    const oldModalDate = document.getElementById('oldModalDate');
    const oldModalTime = document.getElementById('oldModalTime');
    const newReservationDateInput = document.getElementById('newReservationDate');
    const newReservationTimeSelect = document.getElementById('newReservationTime');
    const newReservationUserCodeInput = document.getElementById('newReservationUserCode');
    const confirmEditReservationBtn = document.getElementById('confirmEditReservationBtn');
    const editModalMessage = document.getElementById('editModalMessage');

    let currentEditingReservation = null; // To store the reservation being edited

    // Hardcoded admin credentials (for frontend prompt only)
    const ADMIN_USERNAME = 'ali';
    const ADMIN_PASSWORD = 'bahadir';

    const HOURLY_SLOTS = Array.from({ length: 13 }, (_, i) => {
        const hour = 9 + i;
        return `${hour < 10 ? '0' : ''}${hour}:00`;
    }); // 09:00 to 21:00

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

    async function deleteReservation(date, time) {
        try {
            const response = await fetch(`/reservations/${date}/${time}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Rezervasyon silinirken hata oluştu.');
            }
            return { success: true, message: data.message };
        } catch (error) {
            console.error('Rezervasyon silinirken hata:', error);
            return { success: false, message: error.message || 'Bir hata oluştu.' };
        }
    }

    async function editReservation(oldDate, oldTime, newReservationData) {
        try {
            const response = await fetch(`/reservations/${oldDate}/${oldTime}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newReservationData),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Rezervasyon güncellenirken hata oluştu.');
            }
            return { success: true, message: data.message, reservation: data.reservation };
        } catch (error) {
            console.error('Rezervasyon güncellenirken hata:', error);
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
            cell.colSpan = 4; // Increased colspan for new column
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

            const actionsCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Düzenle';
            editBtn.classList.add('edit-btn');
            editBtn.addEventListener('click', () => openEditReservationModal(res));
            actionsCell.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Sil';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', async () => {
                const confirmDel = confirm(`Rezervasyon (${res.date} ${res.time}) silinsin mi?`);
                if (confirmDel) {
                    const result = await deleteReservation(res.date, res.time);
                    if (result.success) {
                        displayUserMessage(result.message, 'success');
                        renderReservations(); // Re-render table
                    } else {
                        displayUserMessage(result.message, 'error');
                    }
                }
            });
            actionsCell.appendChild(deleteBtn);
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

    function displayEditModalMessage(message, type) {
        editModalMessage.textContent = message;
        editModalMessage.className = `message ${type}`;
        setTimeout(() => {
            editModalMessage.textContent = '';
            editModalMessage.classList.remove(type);
        }, 3000);
    }

    function displayUserMessage(message, type) {
        userMessage.textContent = message;
        userMessage.className = `message ${type}`;
        setTimeout(() => {
            userMessage.textContent = '';
            userMessage.classList.remove(type);
        }, 3000);
    }

    // --- Modal Functions ---
    function populateTimeSlots(selectElement) {
        selectElement.innerHTML = '';
        HOURLY_SLOTS.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot;
            option.textContent = slot;
            selectElement.appendChild(option);
        });
    }

    function openEditReservationModal(reservation) {
        currentEditingReservation = reservation;
        oldModalDate.textContent = new Date(reservation.date).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        oldModalTime.textContent = reservation.time;

        newReservationDateInput.value = reservation.date;
        populateTimeSlots(newReservationTimeSelect);
        newReservationTimeSelect.value = reservation.time;
        newReservationUserCodeInput.value = reservation.userCode;

        editModalMessage.textContent = '';
        editModalMessage.classList.remove('success', 'error');
        editReservationModal.style.display = 'block';

        // Set min date for newReservationDateInput to today
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        newReservationDateInput.min = `${year}-${month}-${day}`;
    }

    function closeEditReservationModal() {
        editReservationModal.style.display = 'none';
        currentEditingReservation = null;
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
        // Allow alphanumeric characters, exactly 6 in length
        if (!newCode || !/^[a-zA-Z0-9]{6}$/.test(newCode)) {
            displayUserMessage('Lütfen 6 karakterli (harf ve/veya sayı) geçerli bir kullanıcı kodu girin.', 'error');
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

    closeModalEditBtn.addEventListener('click', closeEditReservationModal);
    window.addEventListener('click', (event) => {
        if (event.target === editReservationModal) {
            closeEditReservationModal();
        }
    });

    confirmEditReservationBtn.addEventListener('click', async () => {
        if (!currentEditingReservation) return;

        const oldDate = currentEditingReservation.date;
        const oldTime = currentEditingReservation.time;

        const newDate = newReservationDateInput.value;
        const newTime = newReservationTimeSelect.value;
        const newUserCode = newReservationUserCodeInput.value;

        // Client-side validation for new reservation data
        if (!newDate || !newTime || !newUserCode) {
            displayEditModalMessage('Tüm alanları doldurunuz.', 'error');
            return;
        }
        if (!/^[a-zA-Z0-9]{6}$/.test(newUserCode)) {
            displayEditModalMessage('Yeni kullanıcı kodu 6 karakterli (harf ve/veya sayı) olmalıdır.', 'error');
            return;
        }

        const newReservationDate = new Date(newDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        newReservationDate.setHours(0, 0, 0, 0);

        if (newReservationDate < today) {
            displayEditModalMessage('Geçmiş bir tarih için rezervasyon yapılamaz.', 'error');
            return;
        }

        const result = await editReservation(oldDate, oldTime, {
            newDate,
            newTime,
            newUserCode
        });

        if (result.success) {
            displayEditModalMessage(result.message, 'success');
            setTimeout(() => {
                closeEditReservationModal();
                renderReservations(); // Re-render table to show updated data
            }, 1500);
        } else {
            displayEditModalMessage(result.message, 'error');
        }
    });
});
