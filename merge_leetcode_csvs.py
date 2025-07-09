import csv

# File paths
concepts_file = 'leetcode_divided_by_concepts.csv'
questions_file = 'all-leetcode-questions.csv'
links_file = 'leetcode_with_concepts_and_links.csv'
output_file = 'leetcode_master.csv'

# Load concepts
concept_map = {}
with open(concepts_file, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        title = row['Title'].strip()
        concept = row['Concept'].strip()
        concept_map[title] = concept

# Load questions (difficulty, acceptance)
qa_map = {}
with open(questions_file, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        title = row['Title'].strip()
        acceptance = row['Acceptance'].strip()
        difficulty = row['Difficulty'].strip()
        qa_map[title] = {'acceptance': acceptance, 'difficulty': difficulty}

# Load links
link_map = {}
with open(links_file, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        title = row['Title'].strip()
        link = row['LeetCode Link'].strip()
        link_map[title] = link

# Merge and write output
with open(output_file, 'w', newline='', encoding='utf-8') as f:
    fieldnames = ['Title', 'Concept', 'Difficulty', 'Acceptance', 'LeetCode Link']
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for title in concept_map:
        row = {
            'Title': title,
            'Concept': concept_map.get(title, ''),
            'Difficulty': qa_map.get(title, {}).get('difficulty', ''),
            'Acceptance': qa_map.get(title, {}).get('acceptance', ''),
            'LeetCode Link': link_map.get(title, '')
        }
        writer.writerow(row)

print(f"Merged CSV saved as {output_file}") 