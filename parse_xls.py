import pandas as pd
import json

file_path = "C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\Most updated class timetable 26-27 part-I.xls"
output_path = "C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\xls_dump.txt"

try:
    xl = pd.ExcelFile(file_path)
    with open(output_path, 'w', encoding='utf-8') as f:
        for sheet in xl.sheet_names:
            df = xl.parse(sheet)
            f.write(f"=== SHEET: {sheet} ===\n")
            f.write(df.to_string())
            f.write("\n\n")
    print(f"Successfully wrote dump to {output_path}")
except Exception as e:
    print(f"Error reading file: {e}")
