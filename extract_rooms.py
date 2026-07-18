import pandas as pd

file_path = "C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\Most updated class timetable 26-27 part-I.xls"

try:
    xl = pd.ExcelFile(file_path)
    df = xl.parse("108A")
    print("--- First 15 rows of 108A ---")
    for r in range(15):
        row_data = []
        for c in range(min(15, len(df.columns))):
            val = str(df.iloc[r, c])
            if val != 'nan' and val.strip():
                # Replace newlines with | for easier reading
                val = val.replace('\n', ' | ')
                row_data.append(f"[{c}]: {val}")
        if row_data:
            print(f"Row {r}: " + "  ".join(row_data))
except Exception as e:
    print(f"Error: {e}")
