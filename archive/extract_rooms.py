import pandas as pd
import json
import re

file_path = "C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\archive\\Most updated class timetable 26-27 part-I.xls"
output_path = "C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\data.json"

days_of_week = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

def clean_text(val):
    return str(val).strip() if pd.notna(val) else ""

def normalize_time(val):
    time_str = clean_text(val).replace('am', '').replace('pm', '').replace(' ', '').replace('To', '–').replace('.', ':')
    return time_str

def extract_primary_room(df, sheet_name):
    # Scan first 10 rows for "Lect. Hall No" or "Room No"
    for r in range(min(10, len(df))):
        for c in range(min(10, len(df.columns))):
            val = clean_text(df.iloc[r, c])
            match = re.search(r"(?:Lect\.?\s*Hall\s*No\.?-|Class\s*room:|Room\s*No\.?\s*[:\.-]?)\s*([A-Za-z0-9\-]+)", val, flags=re.IGNORECASE)
            if match:
                room = match.group(1).upper().replace(" ", "")
                # Ensure it looks like a room (digits + optional letter)
                if re.match(r"^\d{3}[A-Z]?$", room):
                    return room
                    
    # If no room in header, check if sheet name is a room
    room = sheet_name.upper().replace(" ", "")
    if re.match(r"^\d{3}[A-Z]?$", room):
        return room
        
    return None

def extract_explicit_rooms(cell_val):
    # Split by \n or / and look for room patterns
    rooms = set()
    parts = re.split(r'[\n/]', cell_val)
    for part in parts:
        part = part.strip().upper()
        # Find all room-like strings in the part
        matches = re.findall(r"\b\d{3}[A-Z]?\b", part)
        for match in matches:
            rooms.add(match)
    return list(rooms)

def format_cell_content(cell_val):
    # Replace multiple newlines with a single space or ' | '
    lines = [line.strip() for line in cell_val.split('\n') if line.strip()]
    return " | ".join(lines)

def build():
    print(f"Loading {file_path}...")
    xl = pd.ExcelFile(file_path)
    
    # room_id -> { "id", "name", "timetable": [] }
    rooms_db = {}
    
    def get_room(room_code):
        if room_code not in rooms_db:
            rooms_db[room_code] = {
                "id": room_code,
                "name": room_code,
                "type": "lab" if re.search(r"[A-Z]", room_code) else "classroom",
                "capacity": 60,
                "equipment": [],
                "timetable": []
            }
        return rooms_db[room_code]

    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        
        primary_room = extract_primary_room(df, sheet)
        print(f"Sheet '{sheet}': Primary Room = {primary_room}")
        
        # Find timing row
        timing_row = -1
        for r in range(min(40, len(df))):
            for c in range(min(5, len(df.columns))):
                if 'timing' in clean_text(df.iloc[r, c]).lower():
                    timing_row = r
                    break
            if timing_row != -1:
                break
                
        if timing_row == -1:
            print(f"  -> Skipping, no timing row found.")
            continue
            
        # Extract timeslots
        timeslots = []
        for c in range(len(df.columns)):
            val = clean_text(df.iloc[timing_row, c])
            if "To" in val or "-" in val or "–" in val:
                timeslots.append((c, normalize_time(val)))
                
        if not timeslots:
            print(f"  -> Skipping, no valid timeslots found.")
            continue
            
        # Parse days
        for r in range(timing_row + 1, len(df)):
            day = None
            for c in range(min(3, len(df.columns))):
                val = clean_text(df.iloc[r, c]).upper()
                if val in days_of_week:
                    day = val
                    break
                    
            if not day:
                continue
                
            for col_idx, timeslot in timeslots:
                cell_val = clean_text(df.iloc[r, col_idx])
                
                # Skip empty or break markers
                if not cell_val or cell_val.upper() == 'NAN':
                    continue
                if len(cell_val) <= 2 and cell_val.upper() in ['R', 'E', 'C', 'S']:
                    continue
                    
                # Format the subject text
                subject_text = format_cell_content(cell_val)
                
                # Identify rooms
                explicit_rooms = extract_explicit_rooms(cell_val)
                target_rooms = explicit_rooms if explicit_rooms else ([primary_room] if primary_room else [])
                
                for r_code in target_rooms:
                    room_obj = get_room(r_code)
                    room_obj["timetable"].append({
                        "day": day,
                        "slot": timeslot,
                        "subject": subject_text,
                        "faculty": "" # Faculty is embedded in the subject text now
                    })

    # Sort timetable for each room by day (not strictly necessary but good)
    # Then save to JSON
    out_list = sorted(list(rooms_db.values()), key=lambda x: x["name"])
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(out_list, f, indent=4)
        
    print(f"\nSuccessfully generated {output_path} with {len(out_list)} unique physical rooms!")

if __name__ == "__main__":
    build()
