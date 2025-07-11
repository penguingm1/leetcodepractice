import pandas as pd
import requests
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

# Debug: Check which slugs from CSV are missing
missing_slugs = []
found_slugs = []

for idx, row in df.iterrows():
    slug = row['slug']
    title = row['Title']
    
    if slug in popularity_map:
        found_slugs.append((title, slug, popularity_map[slug]))
    else:
        missing_slugs.append((title, slug))

print(f"\n📊 DEBUG RESULTS:")
print(f"Found: {len(found_slugs)} problems")
print(f"Missing: {len(missing_slugs)} problems")

if missing_slugs:
    print(f"\n❌ MISSING SLUGS:")
    for title, slug in missing_slugs:
        print(f"  {title} -> {slug}")
        
    # Try to find similar slugs in API
    print(f"\n🔍 TRYING TO FIND SIMILAR SLUGS:")
    for title, slug in missing_slugs:
        similar_found = []
        for api_slug in popularity_map.keys():
            if slug in api_slug or api_slug in slug:
                similar_found.append(api_slug)
        
        if similar_found:
            print(f"  {title} ({slug}) -> Similar: {similar_found[:3]}")  # Show first 3 matches
        else:
            print(f"  {title} ({slug}) -> No similar slugs found")

# Show some examples of found slugs
print(f"\n✅ EXAMPLES OF FOUND SLUGS:")
for title, slug, submissions in found_slugs[:5]:
    print(f"  {title} -> {slug} ({submissions:,} submissions)") 