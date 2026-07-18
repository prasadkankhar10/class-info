let roomsData = [];

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const root = document.documentElement;
const themeButton = document.getElementById('theme-btn');

initializeTheme();

themeButton?.addEventListener('click', () => {
    const activeTheme = root.getAttribute('data-theme') || 'light';
    const nextTheme = activeTheme === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
});

document.addEventListener('DOMContentLoaded', async () => {
    const loadedRooms = await loadRooms();
    if (!loadedRooms) return;

    roomsData = loadedRooms;

    if (document.getElementById('rooms-grid')) {
        mountHomePage();
        return;
    }

    if (document.getElementById('room-content')) {
        mountRoomPage();
    }
});

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    root.setAttribute('data-theme', savedTheme);
}

async function loadRooms() {
    try {
        const response = await fetch('data.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Unable to load room data:', error);
        alert('Unable to load room data. Start a local server and reload this page.');
        return null;
    }
}

function mountHomePage() {
    const grid = document.getElementById('rooms-grid');
    const loader = document.getElementById('loader');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const noResults = document.getElementById('no-results');

    if (!grid || !searchInput || !noResults) return;

    let activeFilter = 'all';
    let searchQuery = '';

    const render = () => {
        grid.innerHTML = '';

        const filteredRooms = roomsData.filter(room => {
            const matchesFilter = activeFilter === 'all' || room.type === activeFilter;
            const matchesSearch =
                String(room.name || '').toLowerCase().includes(searchQuery) ||
                String(room.id || '').toLowerCase().includes(searchQuery);
            return matchesFilter && matchesSearch;
        });

        if (filteredRooms.length === 0) {
            grid.classList.add('hidden');
            noResults.classList.remove('hidden');
            return;
        }

        grid.classList.remove('hidden');
        noResults.classList.add('hidden');

        filteredRooms.forEach(room => {
            const { status, colorClass } = getRoomStatusSummary(room);
            const capacity = Number(room.capacity);
            const capacityText = capacity > 0 ? `${capacity}` : 'Not specified';

            const card = document.createElement('a');
            card.href = room.page || `room.html?id=${room.id}`;
            card.className = 'room-card';
            card.innerHTML = `
                <div class="room-card-header">
                    <div class="room-card-title">${room.name}</div>
                    <span class="badge ${colorClass}">${status}</span>
                </div>
                <div class="room-card-type">${room.type}</div>
                <div class="room-card-footer">
                    <span class="text-sm text-muted">Capacity: ${capacityText}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-light"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            `;

            grid.appendChild(card);
        });
    };

    searchInput.addEventListener('input', event => {
        searchQuery = String(event.target.value || '').trim().toLowerCase();
        render();
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            activeFilter = button.dataset.filter || 'all';
            render();
        });
    });

    loader?.classList.add('hidden');
    render();
}

function mountRoomPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageRoomId = document.body?.dataset?.roomId;
    const roomId = pageRoomId || urlParams.get('id');

    const loader = document.getElementById('loader');
    const content = document.getElementById('room-content');
    const errorMessage = document.getElementById('error-message');

    const room = roomsData.find(item => item.id === roomId);
    loader?.classList.add('hidden');

    if (!room) {
        errorMessage?.classList.remove('hidden');
        return;
    }

    content?.classList.remove('hidden');

    document.title = `${room.name} | Smart Campus`;
    document.getElementById('room-name').textContent = room.name;
    document.getElementById('room-type').textContent = room.type;

    const capacity = Number(room.capacity);
    document.getElementById('room-capacity').textContent = capacity > 0 ? `${capacity} seats` : 'Not specified';

    const today = getDayName();
    const todaySlots = getSlotsForDay(room, today);
    const titleElement = document.getElementById('timetable-title');
    if (titleElement) {
        titleElement.textContent = `Today's Timetable (${today})`;
    }

    renderEquipment(room);
    renderTodaySlots(todaySlots);

    updateClock();
    window.setInterval(updateClock, 60000);
}

function renderEquipment(room) {
    const equipmentContainer = document.getElementById('equipment-tags');
    if (!equipmentContainer) return;

    equipmentContainer.innerHTML = '';
    const equipment = Array.isArray(room.equipment) ? room.equipment : [];

    if (equipment.length === 0) {
        const fallback = document.createElement('span');
        fallback.className = 'text-muted text-sm';
        fallback.textContent = 'No equipment listed';
        equipmentContainer.appendChild(fallback);
        return;
    }

    equipment.forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'equipment-tag';
        tag.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg> ${item}`;
        equipmentContainer.appendChild(tag);
    });
}

function renderTodaySlots(slots) {
    const tableBody = document.getElementById('timetable-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    let activeSlotFound = false;

    if (!Array.isArray(slots) || slots.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="2" class="text-muted">No timetable entries found for today.</td>';
        tableBody.appendChild(row);
        updateLiveStatusIndicator({ subject: 'Free' });
        return;
    }

    slots.forEach(slot => {
        const row = document.createElement('tr');
        const active = isCurrentSlot(slot.slot);
        const free = isAvailableSubject(slot.subject);

        if (active) {
            row.classList.add('active-slot');
            activeSlotFound = true;
            updateLiveStatusIndicator(slot);
        }

        row.innerHTML = `
            <td>
                <span class="slot-time">${formatSlotForDisplay(slot.slot)}</span>
            </td>
            <td>
                <span class="slot-subject" style="color: ${free ? 'var(--status-free)' : 'inherit'}">${slot.subject}</span>
                ${slot.faculty ? `<span class="slot-faculty">${slot.faculty}</span>` : ''}
            </td>
        `;

        tableBody.appendChild(row);
    });

    if (!activeSlotFound) {
        updateLiveStatusIndicator({ subject: 'Free' });
    }
}

function updateLiveStatusIndicator(slot) {
    const indicator = document.getElementById('room-status-indicator');
    const text = document.getElementById('room-status-text');
    if (!indicator || !text) return;

    if (isAvailableSubject(slot.subject)) {
        indicator.className = 'status-indicator free';
        text.textContent = 'Available now';
        return;
    }

    indicator.className = 'status-indicator occupied';
    text.textContent = `Occupied - ${slot.subject}`;
}

function getRoomStatusSummary(room) {
    const slots = getSlotsForDay(room, getDayName());

    for (const slot of slots) {
        if (!isCurrentSlot(slot.slot)) continue;
        if (isAvailableSubject(slot.subject)) {
            return { status: 'Available', colorClass: 'free' };
        }
        return { status: 'Occupied', colorClass: 'occupied' };
    }

    return { status: 'Available', colorClass: 'free' };
}

function getDayName(date = new Date()) {
    return DAY_NAMES[date.getDay()];
}

function getSlotsForDay(room, dayName) {
    if (room?.weeklyTimetable && Array.isArray(room.weeklyTimetable[dayName])) {
        return room.weeklyTimetable[dayName];
    }

    if (Array.isArray(room?.timetable)) {
        return room.timetable;
    }

    return [];
}

function isAvailableSubject(subject) {
    const value = String(subject || '').trim().toLowerCase();
    return value === 'free' || value === 'break' || value === 'recess';
}

function parseTime(rawTime) {
    const normalized = String(rawTime || '')
        .toLowerCase()
        .replace(/\./g, ':')
        .replace(/\s+/g, ' ')
        .trim();

    const match = normalized.match(/(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?/);
    if (!match) return NaN;

    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2] || '0', 10);
    const period = match[3];

    if (period === 'pm' && hour < 12) {
        hour += 12;
    } else if (period === 'am' && hour === 12) {
        hour = 0;
    } else if (!period && hour >= 1 && hour <= 6) {
        hour += 12;
    }

    return hour * 60 + minute;
}

function isCurrentSlot(slotText) {
    const [startText, endText] = String(slotText || '').split(/[–-]/);
    if (!startText || !endText) return false;

    const startMinutes = parseTime(startText.trim());
    const endMinutes = parseTime(endText.trim());
    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function formatMinutesTo12Hour(totalMinutes) {
    let hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatSlotForDisplay(slotText) {
    const [startText, endText] = String(slotText || '').split(/[–-]/);
    if (!startText || !endText) return slotText;

    const startMinutes = parseTime(startText.trim());
    const endMinutes = parseTime(endText.trim());
    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) return slotText;

    return `${formatMinutesTo12Hour(startMinutes)} - ${formatMinutesTo12Hour(endMinutes)}`;
}

function updateClock() {
    const clock = document.getElementById('current-clock');
    if (!clock) return;

    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const period = now.getHours() >= 12 ? 'PM' : 'AM';
    clock.textContent = `${hours}:${minutes} ${period}`;
}
