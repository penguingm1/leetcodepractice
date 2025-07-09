import csv
import os

def divide_problems_by_concepts(input_file, output_file):
    """
    Divide problems by concepts, with each concept having only one title per line.
    Problems that belong to multiple concepts will be repeated for each concept.
    """
    concept_problems = {}
    
    # Read the CSV file
    with open(input_file, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            title = row['Title'].strip()
            concepts = row['Concept'].strip()
            
            # Split concepts by comma and clean them
            concept_list = [concept.strip() for concept in concepts.split(',')]
            
            # Add the problem to each concept
            for concept in concept_list:
                if concept not in concept_problems:
                    concept_problems[concept] = []
                concept_problems[concept].append(title)
    
    # Write the output file
    with open(output_file, 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['Concept', 'Title'])
        
        # Write each concept with its problems
        for concept in sorted(concept_problems.keys()):
            for title in concept_problems[concept]:
                writer.writerow([concept, title])
    
    # Print summary
    print(f"Processed {len(concept_problems)} concepts:")
    for concept, problems in sorted(concept_problems.items()):
        print(f"  {concept}: {len(problems)} problems")
    
    total_problems = sum(len(problems) for problems in concept_problems.values())
    print(f"\nTotal entries in output file: {total_problems}")

if __name__ == "__main__":
    input_file = "leetcode_by_new_concepts.csv"
    output_file = "leetcode_divided_by_concepts.csv"
    
    if os.path.exists(input_file):
        divide_problems_by_concepts(input_file, output_file)
        print(f"\nOutput saved to: {output_file}")
    else:
        print(f"Error: {input_file} not found!") 