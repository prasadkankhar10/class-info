import json
import collections

data_path = "C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\data.json"

try:
    with open(data_path, "r", encoding="utf-8") as f:
        rooms = json.load(f)
except Exception as e:
    print(f"Error loading data.json: {e}")
    exit(1)

total_rooms = len(rooms)
total_slots = 0
empty_slots = 0
double_booked = []
long_subjects = []

print(f"--- Data Validation Report ---")
print(f"Total Rooms: {total_rooms}")

for room in rooms:
    room_id = room.get("id")
    timetable = room.get("timetable", [])
    
    # Track bookings to find overlaps
    # Map from (day, slot) -> list of subjects
    schedule_map = collections.defaultdict(list)
    
    for entry in timetable:
        total_slots += 1
        day = entry.get("day")
        slot = entry.get("slot")
        subject = entry.get("subject", "").strip()
        
        if not subject:
            empty_slots += 1
            
        if len(subject) > 100:
            long_subjects.append(f"Room {room_id}, {day} {slot}: {subject[:50]}...")
            
        schedule_map[(day, slot)].append(subject)
        
    for (day, slot), subjects in schedule_map.items():
        if len(subjects) > 1:
            double_booked.append(f"Room {room_id}, {day} {slot} has {len(subjects)} entries: {subjects}")

print(f"Total Slots Processed: {total_slots}")
print(f"Empty Subjects: {empty_slots}")

print(f"\n--- Double Bookings ({len(double_booked)}) ---")
if not double_booked:
    print("None found!")
else:
    # Print first 20
    for db in double_booked[:20]:
        print(db)
    if len(double_booked) > 20:
        print(f"... and {len(double_booked) - 20} more.")

print(f"\n--- Unusually Long Subjects ({len(long_subjects)}) ---")
if not long_subjects:
    print("None found!")
else:
    for ls in long_subjects[:10]:
        print(ls)

# Check for rooms with 0 slots
empty_rooms = [r["id"] for r in rooms if len(r.get("timetable", [])) == 0]
if empty_rooms:
    print(f"\n--- Rooms with NO slots scheduled ---")
    print(empty_rooms)
