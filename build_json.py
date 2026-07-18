import pandas as pd
import json

file_path = "C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\Most updated class timetable 26-27 part-I.xls"
output_path = "C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\data.json"

target_sheets = ['108A', '108B', '109', '517', '518', '519', '525', '520', '524', '526', '527']

def parse_time(time_str):
    # Try to make time strings cleaner, e.g., "10:15 am To 11:15 am" -> "10:15–11:15"
    # But for our app, we can just use the raw time_str if it contains "To"
    # Wait, our app expects '–' or '-' for isCurrentSlot.
    # We should normalize "8.00 To 9.00" -> "8:00–9:00"
    time_str = str(time_str).replace('am', '').replace('pm', '').replace(' ', '').replace('To', '–').replace('.', ':')
    return time_str

def build():
    xl = pd.ExcelFile(file_path)
    
    rooms_data = []
    
    for sheet in target_sheets:
        if sheet not in xl.sheet_names:
            print(f"Warning: Sheet {sheet} not found!")
            continue
            
        df = xl.parse(sheet)
        
        # Determine room name/type
        room_type = "lab" if ("lab" in sheet.lower()) else "classroom"
        room = {
            "id": sheet,
            "name": f"Room {sheet}",
            "type": room_type,
            "capacity": 60,
            "equipment": ["Projector", "Whiteboard", "Smartboard"],
            "timetable": []
        }
        
        # Find timing row
        timing_row = -1
        for r in range(len(df)):
            val0 = str(df.iloc[r, 0]).strip().lower()
            val1 = str(df.iloc[r, 1]).strip().lower()
            if 'timing' in val0 or 'timing' in val1:
                timing_row = r
                break
                
        if timing_row == -1:
            print(f"No timing row in {sheet}")
            continue
            
        # Extract timeslots
        timeslots = []
        for c in range(len(df.columns)):
            val = str(df.iloc[timing_row, c]).strip()
            if "To" in val or "-" in val:
                timeslots.append((c, parse_time(val)))
                
        days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
        
        for r in range(timing_row + 1, min(timing_row + 10, len(df))):
            day = None
            val0 = str(df.iloc[r, 0]).strip()
            val1 = str(df.iloc[r, 1]).strip()
            if val0 in days: day = val0
            elif val1 in days: day = val1
            
            if not day: continue
            
            for col_idx, timeslot in timeslots:
                cell_val = str(df.iloc[r, col_idx]).strip()
                # Skip empty and single letters (RECESS)
                if cell_val == 'nan' or not cell_val:
                    cell_val = "Free"
                elif len(cell_val) <= 2 and cell_val in ['R', 'E', 'C', 'S']:
                    cell_val = "Free"
                else:
                    # Clean up multiple spaces/newlines
                    cell_val = " ".join(cell_val.split())
                    
                room["timetable"].append({
                    "day": day,
                    "slot": timeslot,
                    "subject": cell_val,
                    "faculty": ""
                })
        
        rooms_data.append(room)
        
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(rooms_data, f, indent=4)
        
    print(f"Successfully wrote {len(rooms_data)} rooms to data.json")

build()
