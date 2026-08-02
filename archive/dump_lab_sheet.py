import pandas as pd

file_path = "C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\archive\\LAB TimeTable 2026-27 part-I-CSE.xlsx"
xl = pd.ExcelFile(file_path)

with open("C:\\Users\\prasa\\OneDrive\\Desktop\\ProjectOTG\\Smart Campus\\archive\\lab_sheet_dump.txt", "w", encoding="utf-8") as f:
    df = xl.parse("502A")
    f.write(df.to_string())
