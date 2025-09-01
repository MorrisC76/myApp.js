#!/usr/bin/env python3
"""
Simple Backend API Test to verify core functionality
"""

import requests
import json
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = "https://rsvphub.preview.emergentagent.com/api"

def test_core_functionality():
    """Test the core user flow"""
    print("🧪 Testing Core Backend Functionality...")
    
    # Test 1: User Registration
    print("\n1. Testing User Registration...")
    user_data = {
        "username": f"testuser_{uuid.uuid4().hex[:8]}",
        "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
        "password": "SecurePassword123!",
        "full_name": "Test User",
        "bio": "Test user for API testing"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            print("✅ User Registration: SUCCESS")
        else:
            print(f"❌ User Registration: FAILED - Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ User Registration: ERROR - {e}")
        return False
    
    # Test 2: User Login
    print("\n2. Testing User Login...")
    login_data = {
        "email": user_data["email"],
        "password": user_data["password"]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            print("✅ User Login: SUCCESS")
        else:
            print(f"❌ User Login: FAILED - Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ User Login: ERROR - {e}")
        return False
    
    # Test 3: Protected Endpoint
    print("\n3. Testing Protected Endpoint...")
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        if response.status_code == 200:
            print("✅ Protected Endpoint: SUCCESS")
        else:
            print(f"❌ Protected Endpoint: FAILED - Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Protected Endpoint: ERROR - {e}")
        return False
    
    # Test 4: Event Creation
    print("\n4. Testing Event Creation...")
    future_date = datetime.now(timezone.utc) + timedelta(days=7)
    event_data = {
        "title": "Test Social Meetup",
        "description": "A comprehensive test event for our social app",
        "date": future_date.isoformat(),
        "location": "123 Main Street, Tech Hub, San Francisco, CA 94105",
        "capacity": 50,
        "category": "meetup",
        "price": 25.99,
        "requirements": "Please bring a valid ID",
        "contact_info": "organizer@example.com"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/events", json=event_data, headers=headers)
        if response.status_code == 200:
            event = response.json()
            event_id = event.get("id")
            print("✅ Event Creation: SUCCESS")
        else:
            print(f"❌ Event Creation: FAILED - Status {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Event Creation: ERROR - {e}")
        return False
    
    # Test 5: Get Events
    print("\n5. Testing Get Events...")
    try:
        response = requests.get(f"{BASE_URL}/events", headers=headers)
        if response.status_code == 200:
            events = response.json()
            if isinstance(events, list) and len(events) > 0:
                print("✅ Get Events: SUCCESS")
            else:
                print("❌ Get Events: No events returned")
                return False
        else:
            print(f"❌ Get Events: FAILED - Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Get Events: ERROR - {e}")
        return False
    
    # Test 6: RSVP Creation
    print("\n6. Testing RSVP Creation...")
    rsvp_data = {
        "status": "going",
        "guest_count": 3
    }
    
    try:
        response = requests.post(f"{BASE_URL}/events/{event_id}/rsvp", json=rsvp_data, headers=headers)
        if response.status_code == 200:
            print("✅ RSVP Creation: SUCCESS")
        else:
            print(f"❌ RSVP Creation: FAILED - Status {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ RSVP Creation: ERROR - {e}")
        return False
    
    # Test 7: Comment Creation
    print("\n7. Testing Comment Creation...")
    comment_data = {
        "content": "This looks like an amazing event! Really excited to attend."
    }
    
    try:
        response = requests.post(f"{BASE_URL}/events/{event_id}/comments", json=comment_data, headers=headers)
        if response.status_code == 200:
            print("✅ Comment Creation: SUCCESS")
        else:
            print(f"❌ Comment Creation: FAILED - Status {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Comment Creation: ERROR - {e}")
        return False
    
    # Test 8: Get Comments
    print("\n8. Testing Get Comments...")
    try:
        response = requests.get(f"{BASE_URL}/events/{event_id}/comments", headers=headers)
        if response.status_code == 200:
            comments = response.json()
            if isinstance(comments, list) and len(comments) > 0:
                print("✅ Get Comments: SUCCESS")
            else:
                print("❌ Get Comments: No comments returned")
                return False
        else:
            print(f"❌ Get Comments: FAILED - Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Get Comments: ERROR - {e}")
        return False
    
    # Test 9: Verify RSVP Counts
    print("\n9. Testing RSVP Count Calculation...")
    try:
        response = requests.get(f"{BASE_URL}/events/{event_id}", headers=headers)
        if response.status_code == 200:
            event = response.json()
            total_going = event.get("total_going", 0)
            total_guests = event.get("total_guests", 0)
            user_rsvp = event.get("user_rsvp")
            
            if total_going >= 1 and total_guests >= 3 and user_rsvp == "going":
                print("✅ RSVP Count Calculation: SUCCESS")
            else:
                print(f"❌ RSVP Count Calculation: Counts don't match - going:{total_going}, guests:{total_guests}, user_rsvp:{user_rsvp}")
                return False
        else:
            print(f"❌ RSVP Count Calculation: FAILED - Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ RSVP Count Calculation: ERROR - {e}")
        return False
    
    print("\n🎉 ALL CORE TESTS PASSED!")
    return True

if __name__ == "__main__":
    success = test_core_functionality()
    if success:
        print("\n✅ Backend API is working correctly!")
    else:
        print("\n❌ Backend API has issues!")