import pandas as pd
import re

def clean_url(url):
    """Clean URL by removing trailing spaces and ensuring proper formatting"""
    if pd.isna(url):
        return url
    
    # Remove trailing spaces and whitespace
    url = url.strip()
    
    # Remove any trailing spaces before the final slash
    url = re.sub(r'\s+/$', '/', url)
    
    # Ensure the URL ends with a slash if it doesn't already
    if not url.endswith('/'):
        url += '/'
    
    return url

def clean_csv_urls():
    """Clean URLs in the master CSV file"""
    try:
        # Read the CSV file
        df = pd.read_csv('leetcode_master.csv')
        
        print(f"Original CSV has {len(df)} rows")
        
        # Clean the URLs
        df['LeetCode Link'] = df['LeetCode Link'].apply(clean_url)
        
        # Save the cleaned CSV
        df.to_csv('leetcode_master.csv', index=False)
        
        print("✅ URLs cleaned successfully!")
        print(f"Cleaned CSV saved with {len(df)} rows")
        
        # Show some examples of cleaned URLs
        print("\nExamples of cleaned URLs:")
        for i, row in df.head(5).iterrows():
            print(f"  {row['Title']}: {row['LeetCode Link']}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    clean_csv_urls() 