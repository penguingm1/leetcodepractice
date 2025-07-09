import os
import csv

CSV_FILE = 'leetcode_divided_by_concepts.csv'

def read_problems(csv_file):
    problems = []
    with open(csv_file, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            problems.append({
                'title': row['Title'].strip(),
                'concept': row['Concept'].strip()
            })
    return problems

def slugify(title):
    # Replace spaces with underscores
    title = title.replace(' ', '_')
    # Remove all invalid Windows filename characters
    invalid_chars = '<>:"/\\|?*'
    for ch in invalid_chars:
        title = title.replace(ch, '')
    return title

def sanitize_folder_name(concept):
    # Replace invalid folder name characters with underscores
    invalid_chars = '<>:"/\\|?*'
    folder_name = concept
    for ch in invalid_chars:
        folder_name = folder_name.replace(ch, '_')
    return folder_name

def main():
    problems = read_problems(CSV_FILE)
    print(f"Processing {len(problems)} problems...")
    
    for problem in problems:
        concept = problem['concept']
        title = problem['title']
        
        # Create sanitized concept folder name
        folder_name = sanitize_folder_name(concept)
        folder = os.path.join(os.getcwd(), folder_name)
        os.makedirs(folder, exist_ok=True)
        
        # Create filenames
        base_filename = slugify(title)
        md_path = os.path.join(folder, f"{base_filename}.md")
        py_path = os.path.join(folder, f"{base_filename}.py")
        
        # Create .md file if it doesn't exist
        if not os.path.exists(md_path):
            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(f"# {title}\n\n")
                f.write(f"- Concept: {concept}\n")
                f.write(f"- LeetCode Link: https://leetcode.com/problems/{slugify(title).lower().replace('_', '-')}/\n\n")
                f.write("---\n\n")
                f.write("## Problem Description\n\n")
                f.write("## Solution\n\n")
                f.write("## Time/Space Complexity\n\n")
        
        # Create .py file if it doesn't exist
        if not os.path.exists(py_path):
            with open(py_path, 'w', encoding='utf-8') as f:
                f.write(f"# {title}\n")
                f.write(f"# Concept: {concept}\n\n")
                f.write("class Solution:\n")
                f.write("    def solve(self):\n")
                f.write("        pass\n\n")
                f.write("if __name__ == \"__main__\":\n")
                f.write("    solution = Solution()\n")
                f.write("    # Test cases here\n")
    
    print("Files created successfully!")

if __name__ == "__main__":
    main() 