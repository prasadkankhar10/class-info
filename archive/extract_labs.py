import pandas as pd
import json

lab_file_path = "C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\archive\\LAB TimeTable 2026-27 part-I-CSE.xlsx"
json_path = "C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\data.json"

def clean_text(val):
    return str(val).strip() if pd.notna(val) else ""

def normalize_time(val):
    time_str = clean_text(val).replace('am', '').replace('pm', '').replace(' ', '').replace('To', '–').replace('.', ':')
    return time_str

def build():
    # Load existing data
    with open(json_path, 'r', encoding='utf-8') as f:
        rooms_db = json.load(f)
    
    # Map rooms by ID
    rooms_map = {r["id"]: r for r in rooms_db}
    
    # Load lab excel
    xl = pd.ExcelFile(lab_file_path)
    days_of_week = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
    
    for sheet in xl.sheet_names:
        print(f"Processing Lab Sheet: {sheet}")
        if sheet not in rooms_map:
            print(f"  -> Room {sheet} not found in data.json. Creating it.")
            rooms_map[sheet] = {
                "id": sheet,
                "name": sheet,
                "type": "lab",
                "capacity": 60,
                "equipment": [],
                "timetable": []
            }
        
        # Clear existing timetable for this lab room since this new file is authoritative
        rooms_map[sheet]["timetable"] = []
        
        df = xl.parse(sheet)
        
        timing_row = -1
        for r in range(min(15, len(df))):
            for c in range(min(5, len(df.columns))):
                if 'timing' in clean_text(df.iloc[r, c]).lower():
                    timing_row = r
                    break
            if timing_row != -1:
                break
                
        if timing_row == -1:
            print(f"  -> No timing row found.")
            continue
            
        timeslots = []
        for c in range(len(df.columns)):
            val = clean_text(df.iloc[timing_row, c])
            if "To" in val or "-" in val or "–" in val:
                timeslots.append((c, normalize_time(val)))
                
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
                
                if not cell_val or cell_val.upper() == 'NAN':
                    continue
                if len(cell_val) <= 2 and cell_val.upper() in ['R', 'E', 'C', 'S']:
                    continue
                    
                # Format text
                subject = " | ".join([line.strip() for line in cell_val.replace('\n', '   ').split('   ') if line.strip()])
                
                rooms_map[sheet]["timetable"].append({
                    "day": day,
                    "slot": timeslot,
                    "subject": subject,
                    "faculty": ""
                })
                
    # Save back to json
    out_list = sorted(list(rooms_map.values()), key=lambda x: x["name"])
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(out_list, f, indent=4)
        
    print("Lab extraction and merge complete!")

if __name__ == "__main__":
    build()
