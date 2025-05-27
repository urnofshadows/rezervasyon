document.addEventListener('DOMContentLoaded', () => {
    const calendarContainer = document.getElementById('calendarContainer');
    const currentMonthYearDisplay = document.getElementById('currentMonthYearDisplay');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    const timeSlotsContainer = document.getElementById('timeSlots');
    const reservationModal = document.getElementById('reservationModal');
    const closeModalBtn = reservationModal.querySelector('.close-button');
    const modalDate = document.getElementById('modalDate');
    const modalTime = document.getElementById('modalTime');
    const userCodeInput = document.getElementById('userCode');
    const confirmReservationBtn = document.getElementById('confirmReservationBtn');
    const modalMessage = document.getElementById('modalMessage');

    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth(); // 0-indexed (0 for January)
    let selectedDate = null;
    let selectedTimeSlot = null;

    const MONTH_NAMES = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];

    const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
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

    async function postReservation(reservationData) {
        try {
            const response = await fetch('/reservations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reservationData),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Rezervasyon oluşturulurken hata oluştu.');
            }
            return { success: true, message: data.message, reservation: data.reservation };
        } catch (error) {
            console.error('Rezervasyon gönderilirken hata:', error);
            return { success: false, message: error.message || 'Bir hata oluştu.' };
        }
    }

    // --- Local Storage Functions ---
    function getLocalReservations() {
        const reservations = localStorage.getItem('myReservations');
        return reservations ? JSON.parse(reservations) : [];
    }

    function addLocalReservation(reservation) {
        const reservations = getLocalReservations();
        reservations.push(reservation);
        localStorage.setItem('myReservations', JSON.stringify(reservations));
    }

    // --- Calendar Functions ---
    async function renderCalendar(year, monthIndex) {
        calendarContainer.innerHTML = '';
        currentMonthYearDisplay.textContent = `${MONTH_NAMES[monthIndex]} ${year}`;
        const allReservations = await fetchReservations();

        const monthDiv = document.createElement('div');
        monthDiv.classList.add('month');

        const daysGrid = document.createElement('div');
        daysGrid.classList.add('days-grid');

        // Add day names
        DAY_NAMES.forEach(dayName => {
            const dayNameSpan = document.createElement('span');
            dayNameSpan.classList.add('day-name');
            dayNameSpan.textContent = dayName;
            daysGrid.appendChild(dayNameSpan);
        });

        const firstDay = new Date(year, monthIndex, 1).getDay();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        // Adjust first day for Monday start (0=Sunday, 1=Monday, ..., 6=Saturday)
        // If Sunday (0), make it 6 (Saturday in our Pzt-Paz week)
        // Otherwise, subtract 1
        const startDayOffset = (firstDay === 0) ? 6 : firstDay - 1;

        // Add empty days for alignment
        for (let j = 0; j < startDayOffset; j++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('day', 'empty');
            daysGrid.appendChild(emptyDay);
        }

        // Add actual days
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to start of day for comparison

        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day');
            dayDiv.textContent = day;
            const fullDateString = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayDiv.dataset.date = fullDateString;

            const currentDayDate = new Date(fullDateString);
            currentDayDate.setHours(0, 0, 0, 0); // Normalize currentDayDate to start of day

            // Check if this day is in the past
            if (currentDayDate < today) {
                dayDiv.classList.add('past-date');
                // Do not add click listener for past dates
            } else {
                // Check if this day has any reservations
                const dayHasReservation = allReservations.some(res => res.date === dayDiv.dataset.date);
                if (dayHasReservation) {
                    dayDiv.classList.add('has-reservation');
                }
                dayDiv.addEventListener('click', () => selectDay(dayDiv.dataset.date, allReservations));
            }
            daysGrid.appendChild(dayDiv);
        }
        monthDiv.appendChild(daysGrid);
        calendarContainer.appendChild(monthDiv);
    }

    async function selectDay(dateString, allReservations = null) {
        // Remove 'selected' class from previously selected day
        const previouslySelected = document.querySelector('.day.selected');
        if (previouslySelected) {
            previouslySelected.classList.remove('selected');
        }

        // Add 'selected' class to the new day
        const currentSelected = document.querySelector(`.day[data-date="${dateString}"]`);
        if (currentSelected) {
            currentSelected.classList.add('selected');
        }

        selectedDate = dateString;
        selectedDateDisplay.textContent = new Date(dateString).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Fetch reservations if not already provided (e.g., on initial load or direct day click)
        if (!allReservations) {
            allReservations = await fetchReservations();
        }
        renderTimeSlots(dateString, allReservations);
    }

    function renderTimeSlots(dateString, allReservations) {
        timeSlotsContainer.innerHTML = '';
        const reservationsForSelectedDay = allReservations.filter(res => res.date === dateString);

        HOURLY_SLOTS.forEach(slot => {
            const timeSlotDiv = document.createElement('div');
            timeSlotDiv.classList.add('time-slot');
            timeSlotDiv.textContent = slot;
            timeSlotDiv.dataset.time = slot;

            const isReserved = reservationsForSelectedDay.some(res => res.time === slot);
            if (isReserved) {
                timeSlotDiv.classList.add('reserved');
            } else {
                timeSlotDiv.addEventListener('click', () => openReservationModal(dateString, slot));
            }
            timeSlotsContainer.appendChild(timeSlotDiv);
        });
    }

    // --- Modal Functions ---
    function openReservationModal(date, time) {
        selectedTimeSlot = time;
        modalDate.textContent = new Date(date).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        modalTime.textContent = time;
        userCodeInput.value = ''; // Clear previous input
        modalMessage.textContent = ''; // Clear previous messages
        modalMessage.classList.remove('success', 'error');
        reservationModal.style.display = 'block';

        // Remove 'selected-slot' from any previously selected slot
        const previouslySelectedSlot = document.querySelector('.time-slot.selected-slot');
        if (previouslySelectedSlot) {
            previouslySelectedSlot.classList.remove('selected-slot');
        }
        // Add 'selected-slot' to the currently clicked slot
        const currentSlotElement = document.querySelector(`.time-slot[data-time="${time}"]`);
        if (currentSlotElement) {
            currentSlotElement.classList.add('selected-slot');
        }
    }

    function closeReservationModal() {
        reservationModal.style.display = 'none';
        // Remove 'selected-slot' when modal closes
        const previouslySelectedSlot = document.querySelector('.time-slot.selected-slot');
        if (previouslySelectedSlot) {
            previouslySelectedSlot.classList.remove('selected-slot');
        }
    }

    // --- Event Listeners ---
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar(currentYear, currentMonth);
        selectedDate = null; // Reset selected date
        selectedDateDisplay.textContent = '';
        timeSlotsContainer.innerHTML = ''; // Clear time slots
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar(currentYear, currentMonth);
        selectedDate = null; // Reset selected date
        selectedDateDisplay.textContent = '';
        timeSlotsContainer.innerHTML = ''; // Clear time slots
    });

    closeModalBtn.addEventListener('click', closeReservationModal);
    window.addEventListener('click', (event) => {
        if (event.target === reservationModal) {
            closeReservationModal();
        }
    });

    confirmReservationBtn.addEventListener('click', async () => {
        const userCode = userCodeInput.value;
        if (!userCode || !/^[a-zA-Z0-9]{6}$/.test(userCode)) {
            modalMessage.textContent = 'Lütfen 6 karakterli (harf ve/veya sayı) geçerli bir kullanıcı kodu girin.';
            modalMessage.classList.add('error');
            modalMessage.classList.remove('success');
            return;
        }

        const reservationData = {
            date: selectedDate,
            time: selectedTimeSlot,
            userCode: userCode
        };

        const result = await postReservation(reservationData);

        if (result.success) {
            modalMessage.textContent = result.message;
            modalMessage.classList.add('success');
            modalMessage.classList.remove('error');
            addLocalReservation(result.reservation); // Save to local storage
            setTimeout(() => {
                closeReservationModal();
                renderCalendar(currentYear); // Re-render calendar to update reserved days/slots
                selectDay(selectedDate); // Re-select day to update time slots
            }, 1500);
        } else {
            modalMessage.textContent = result.message;
            modalMessage.classList.add('error');
            modalMessage.classList.remove('success');
        }
    });

    // Initial render
    renderCalendar(currentYear, currentMonth);
});
