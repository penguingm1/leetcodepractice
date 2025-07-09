import csv
import os

input_file = 'leetcode_with_concepts_and_links.csv'
temp_file = 'temp_leetcode.csv'

with open(input_file, newline='', encoding='utf-8') as infile, \
     open(temp_file, 'w', newline='', encoding='utf-8') as outfile:
    reader = csv.DictReader(infile)
    fieldnames = ['Title', 'LeetCode Link']
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()
    for row in reader:
        writer.writerow({k: row[k] for k in fieldnames})

# Overwrite the original file
os.replace(temp_file, input_file)

print(f"Concept column removed. {input_file} has been updated.") 