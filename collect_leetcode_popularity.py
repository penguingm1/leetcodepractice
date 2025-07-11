import pandas as pd
import requests
import time
import re

# Load your CSV
df = pd.read_csv('leetcode_master.csv')

# Manual mappings for problematic slugs
manual_mappings = {
    'longest-arithmetic-sequence': 'longest-arithmetic-subsequence',
    'array-partition-i': 'array-partition',
    'implement-strstr': 'implement-strstr',
    'all-o`one-data-structure': 'all-oone-data-structure',
    'increasing-subsequences': 'increasing-subsequences',
    'coin-change-2': 'coin-change-ii',
    'last-person-to-fit-in-the-elevator': 'last-person-to-fit-in-the-elevator',
    'play-with-chips': 'play-with-chips',
    'bulb-switcher-iii': 'bulb-switcher-iii',
    'capital-gain/loss': 'capital-gainloss',
    'top-travellersnew': 'top-travellers',
    'friend-circles': 'friend-circles',
    'classes-more-than-5-students': 'classes-more-than-5-students'
}

# Improved slug extraction function
def extract_slug(url):
    try:
        # Extract the slug from URL
        slug = url.strip('/').split('/')[-1]
        
        # Clean up special characters
        slug = re.sub(r'[^\w-]', '', slug)  # Remove special chars except hyphens
        
        # Apply manual mappings
        if slug in manual_mappings:
            slug = manual_mappings[slug]
            
        return slug
    except Exception:
        return ''

df['slug'] = df['LeetCode Link'].apply(extract_slug)

# Fetch all problems from LeetCode API
try:
    response = requests.get("https://leetcode.com/api/problems/all/")
    response.raise_for_status()
    data = response.json()['stat_status_pairs']
    print(f"✅ Fetched {len(data)} problems from LeetCode API")
except Exception as e:
    print(f"❌ Error fetching LeetCode API: {e}")
    data = []

# Create slug → total_submitted map
popularity_map = {}
for item in data:
    slug = item['stat']['question__title_slug']
    submissions = item['stat']['total_submitted']
    popularity_map[slug] = submissions

print(f"✅ Created popularity map with {len(popularity_map)} entries")

# Add popularity column with improved matching
def get_popularity(slug):
    if not slug:
        return 'N/A'
    
    # Direct match
    if slug in popularity_map:
        return popularity_map[slug]
    
    # Try variations
    variations = [
        slug.replace('-', ''),
        slug.replace('-', '_'),
        slug.lower(),
        slug.replace('ii', '2'),
        slug.replace('2', 'ii')
    ]
    
    for var in variations:
        if var in popularity_map:
            return popularity_map[var]
    
    return 'N/A'

popularity = df['slug'].apply(get_popularity)

# Insert popularity after LeetCode Link
cols = list(df.columns)
link_idx = cols.index('LeetCode Link')
new_cols = cols[:link_idx+1] + ['popularity'] + cols[link_idx+1:]
df['popularity'] = popularity
df = df[new_cols]

# Drop slug column
df.drop(columns=['slug'], inplace=True)

# Save result
df.to_csv('leetcode_master_with_popularity.csv', index=False)
print("✅ Saved as leetcode_master_with_popularity.csv")

# Print statistics
total_problems = len(df)
na_count = len(df[df['popularity'] == 'N/A'])
success_rate = ((total_problems - na_count) / total_problems) * 100

print(f"📊 Statistics:")
print(f"   Total problems: {total_problems}")
print(f"   Problems with N/A: {na_count}")
print(f"   Success rate: {success_rate:.1f}%") 