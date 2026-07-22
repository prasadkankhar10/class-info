import pandas as pd
import re

file_path = "C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\archive\\Most updated class timetable 26-27 part-I.xls"

xl = pd.ExcelFile(file_path)

cell_formats = []

for sheet in xl.sheet_names:
    df = xl.parse(sheet)
    for r in range(len(df)):
        for c in range(len(df.columns)):
            val = str(df.iloc[r, c]).strip()
            if val and val != 'nan':
                # Split by newline
                lines = [line.strip() for line in val.split('\n') if line.strip()]
                if len(lines) >= 3:
                    # Check if last line contains room-like patterns (e.g. 502A, 108B, 402)
                    last_line = lines[-1]
                    if re.search(r'\d{3}[A-Z]?', last_line):
                        cell_formats.append(f"Sheet: {sheet} | Last Line: {last_line} | Full Cell:\n{val}\n---\n")

with open("C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\archive\\cell_analysis.txt", "w", encoding="utf-8") as f:
    # write sample of first 50
    f.writelines(cell_formats[:50])

print(f"Found {len(cell_formats)} complex cells. Saved sample to cell_analysis.txt")
