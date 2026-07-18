// State
let roomsData = [];

const WEEK_DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

// DOM Elements
const themeBtn = document.getElementById('theme-btn');
const root = document.documentElement;

// Theme Initialization
const savedTheme = localStorage.getItem('theme') || 'light';
root.setAttribute('data-theme', savedTheme);

themeBtn?.addEventListener('click', () => {
    const currentTheme = root.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch('data.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        roomsData = await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load room data. Please open via http://localhost:8000.');
        return;
    }

    // Router based on page content
    if (document.getElementById('rooms-grid')) {
        initHomePage();
    } else if (document.getElementById('room-content')) {
        initRoomPage();
    }
}

// ==========================================
// HOME PAGE LOGIC
// ==========================================
function initHomePage() {
    const grid = document.getElementById('rooms-grid');
    const loader = document.getElementById('loader');
    const searchInput = document.getElementById('search-input');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const noResults = document.getElementById('no-results');

    let currentFilter = 'all';
    let searchQuery = '';

    const renderRooms = () => {
        grid.innerHTML = '';
        
        const filtered = roomsData.filter(room => {
            const matchesFilter = currentFilter === 'all' || room.type === currentFilter;
            const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  room.id.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            grid.classList.add('hidden');
            noResults.classList.remove('hidden');
        } else {
            grid.classList.remove('hidden');
            noResults.classList.add('hidden');
            
            filtered.forEach(room => {
                const { status, colorClass } = getRoomStatusSummary(room);
                
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
                        <span class="text-sm text-muted">Capacity: ${room.capacity}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-light"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    };

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderRooms();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderRooms();
        });
    });

    // Hide loader and initial render
    loader.classList.add('hidden');
    renderRooms();
}

// ==========================================
// ROOM DETAILS LOGIC
// ==========================================
function initRoomPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const bodyRoomId = document.body?.dataset?.roomId;
    const roomId = bodyRoomId || urlParams.get('id');
    const loader = document.getElementById('loader');
    const content = document.getElementById('room-content');
    const errorMsg = document.getElementById('error-message');

    const room = roomsData.find(r => r.id === roomId);

    loader.classList.add('hidden');

    if (!room) {
        errorMsg.classList.remove('hidden');
        return;
    }

    content.classList.remove('hidden');

    // Populate data
    document.title = `${room.name} | Smart Campus`;
    document.getElementById('room-name').textContent = room.name;
    document.getElementById('room-type').textContent = room.type;
    const capacity = Number(room.capacity);
    document.getElementById('room-capacity').textContent = capacity > 0 ? `${capacity} Seats` : 'Not specified';

    const currentDay = getCurrentDayName();
    const currentDaySlots = getRoomTimetableForDay(room, currentDay);
    const timetableTitle = document.getElementById('timetable-title');
    if (timetableTitle) {
        timetableTitle.textContent = `Today's Timetable (${currentDay})`;
    }
    
    // Equipment tags
    const equipmentContainer = document.getElementById('equipment-tags');
    equipmentContainer.innerHTML = '';
    const equipmentList = Array.isArray(room.equipment) ? room.equipment : [];
    if (equipmentList.length === 0) {
        const fallback = document.createElement('span');
        fallback.className = 'text-muted text-sm';
        fallback.textContent = 'No equipment listed';
        equipmentContainer.appendChild(fallback);
    } else {
        equipmentList.forEach(item => {
            const span = document.createElement('span');
            span.className = 'equipment-tag';
            span.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg> ${item}`;
            equipmentContainer.appendChild(span);
        });
    }

    // Timetable - Filter by current day
    const tbody = document.getElementById('timetable-body');
    let activeSlotFound = false;

    if (currentDaySlots.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="2" class="text-muted" style="text-align: center; padding: 1rem;">No classes scheduled for today.</td>`;
        tbody.appendChild(tr);
    }

    currentDaySlots.forEach(slot => {
        const tr = document.createElement('tr');
        const isActive = isCurrentSlot(slot.slot);
        
        if (isActive) {
            tr.classList.add('active-slot');
            activeSlotFound = true;
            updateLiveStatusIndicator(slot);
        }

        const isFree = isFreeSubject(slot.subject);
        
        tr.innerHTML = `
            <td>
                <span class="slot-time">${formatSlotForDisplay(slot.slot)}</span>
            </td>
            <td>
                <span class="slot-subject" style="color: ${isFree ? 'var(--status-free)' : 'inherit'}">${slot.subject}</span>
                ${slot.faculty ? `<span class="slot-faculty">${slot.faculty}</span>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (!activeSlotFound) {
        // Not within any defined slot, assume available
        updateLiveStatusIndicator({ subject: 'Free' });
    }

    // Start clock
    updateClock();
    setInterval(updateClock, 60000); // update every minute
}

function updateLiveStatusIndicator(activeSlot) {
    const indicator = document.getElementById('room-status-indicator');
    const text = document.getElementById('room-status-text');
    
    const isFree = isFreeSubject(activeSlot.subject);
    
    if (isFree) {
        indicator.className = 'status-indicator free';
        text.textContent = 'Available Now';
    } else {
        indicator.className = 'status-indicator occupied';
        text.textContent = `Occupied - ${activeSlot.subject}`;
    }
}

function getRoomStatusSummary(room) {
    let status = 'Available';
    let colorClass = 'free';

    const currentDaySlots = getRoomTimetableForDay(room, getCurrentDayName());

    for (const slot of currentDaySlots) {
        if (isCurrentSlot(slot.slot)) {
            if (!isFreeSubject(slot.subject)) {
                status = 'Occupied';
                colorClass = 'occupied';
            }
            break;
        }
    }
    return { status, colorClass };
}

function getCurrentDayName(date = new Date()) {
    return WEEK_DAYS[date.getDay()];
}

function getRoomTimetableForDay(room, dayName) {
    if (room?.weeklyTimetable && Array.isArray(room.weeklyTimetable[dayName])) {
        return room.weeklyTimetable[dayName];
    }

    if (Array.isArray(room?.timetable)) {
        // If the timetable slots have a 'day' property, filter by it
        const daySlots = room.timetable.filter(slot => slot.day === dayName);
        if (daySlots.length > 0) return daySlots;
        
        // Otherwise return the whole timetable (backward compatibility)
        // Only return if none of the slots have a 'day' property to prevent showing all days if a specific day is empty
        if (!room.timetable.some(slot => slot.day)) {
             return room.timetable;
        }
        return [];
    }

    return [];
}

function isFreeSubject(subject) {
    const normalized = String(subject || '').trim().toLowerCase();
    return normalized === 'free' || normalized === 'break' || normalized === 'recess';
}

// ==========================================
// TIME LOGIC UTILITIES
// ==========================================
function parseTime(timeStr) {
    const normalized = timeStr
        .toLowerCase()
        .replace(/\./g, ':')
        .replace(/\s+/g, ' ')
        .trim();

    const match = normalized.match(/(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?/);
    if (!match) return NaN;

    let hour = parseInt(match[1], 10);
    const min = parseInt(match[2] || '0', 10);
    const period = match[3];

    if (period === 'pm' && hour < 12) {
        hour += 12;
    } else if (period === 'am' && hour === 12) {
        hour = 0;
    } else if (!period && hour >= 1 && hour <= 6) {
        // Timetable slots 1-6 without AM/PM are afternoon sessions.
        hour += 12;
    }

    return hour * 60 + min; // minutes since midnight
}

function isCurrentSlot(slotStr) {
    const [startStr, endStr] = slotStr.split(/[–-]/);
    
    if (!startStr || !endStr) return false;

    const startMin = parseTime(startStr.trim());
    const endMin = parseTime(endStr.trim());
    if (Number.isNaN(startMin) || Number.isNaN(endMin)) return false;
    
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    
    return currentMin >= startMin && currentMin < endMin;
}

function formatMinutesTo12Hour(totalMinutes) {
    let hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

function formatSlotForDisplay(slotStr) {
    const [startStr, endStr] = String(slotStr).split(/[–-]/);
    if (!startStr || !endStr) return slotStr;

    const startMin = parseTime(startStr.trim());
    const endMin = parseTime(endStr.trim());
    if (Number.isNaN(startMin) || Number.isNaN(endMin)) return slotStr;

    return `${formatMinutesTo12Hour(startMin)} - ${formatMinutesTo12Hour(endMin)}`;
}

function updateClock() {
    const clockEl = document.getElementById('current-clock');
    if (!clockEl) return;
    
    const now = new Date();
    let h = now.getHours();
    let m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    m = m < 10 ? '0' + m : m;
    
    clockEl.textContent = `${h}:${m} ${ampm}`;
}
