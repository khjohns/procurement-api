import os
import sys
from pathlib import Path

# Add src to sys.path
sys.path.append(str(Path(__file__).parent.parent / "src"))

from app.doffin import DoffinClient, DoffinAPIError

def test_doffin_search():
    api_key = os.environ.get("DOFFIN_API_KEY")
    if not api_key:
        print("SKIP: DOFFIN_API_KEY not set")
        return

    client = DoffinClient(api_key=api_key)
    print(f"Testing Doffin search at {client.base_url}...")
    
    try:
        # Simple search for "bru" (bridge)
        results = client.search_notices(search_string="bru", num_hits_per_page=5)
        print("Search successful!")
        print(f"Total hits: {results.get('numHitsTotal')}")
        
        hits = results.get("hits", [])
        if hits:
            first_hit = hits[0]
            print(f"First hit ID: {first_hit.get('id')}")
            print(f"Heading: {first_hit.get('heading')}")
            
            # Test download if we have an ID
            doffin_id = first_hit.get('id')
            if doffin_id:
                print(f"\nTesting download for {doffin_id}...")
                content = client.download_notice(doffin_id)
                print(f"Download successful! Content size: {len(content)} bytes")
        else:
            print("No hits found for 'bru'.")
            
    except DoffinAPIError as e:
        print(f"Doffin API Error: {e.status_code} {e.reason}")
        print(f"Body: {e.body}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    test_doffin_search()
