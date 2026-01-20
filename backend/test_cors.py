# backend/test_cors_fix.py
import requests
import json

def test_cors_fix():
    print("🔍 Testing CORS configuration...")
    
    # Test 1: OPTIONS request (preflight)
    print("\n1. Testing OPTIONS (preflight)...")
    try:
        response = requests.options(
            "http://localhost:8000/api/tests/quizzes/",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type, Authorization",
            }
        )
        print(f"   Status: {response.status_code}")
        print(f"   Headers:")
        for key, value in response.headers.items():
            if 'access-control' in key.lower():
                print(f"     {key}: {value}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Test avec un token (vous devez avoir un token)
    print("\n2. Testing POST with dummy data...")
    try:
        # Créez d'abord un token de test
        login_response = requests.post(
            "http://localhost:8000/api/accounts/login/",
            json={"username": "teacher1", "password": "password123"},
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get('access')
            print(f"   ✅ Got token: {token[:20]}...")
            
            test_data = {
                "title": "CORS Test Quiz",
                "subject": 1,
                "quiz_type": "quiz",
                "duration": 60,
                "total_marks": 100,
                "passing_marks": 50,
                "start_time": "2024-12-17T10:00:00Z",
                "end_time": "2024-12-17T12:00:00Z"
            }
            
            post_response = requests.post(
                "http://localhost:8000/api/tests/quizzes/",
                json=test_data,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Origin": "http://localhost:5173"
                }
            )
            
            print(f"   Status: {post_response.status_code}")
            print(f"   Response: {post_response.text[:200]}")
            
            # Check CORS headers
            print(f"   CORS Headers:")
            for key, value in post_response.headers.items():
                if 'access-control' in key.lower():
                    print(f"     {key}: {value}")
        else:
            print(f"   ❌ Login failed: {login_response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "="*50)
    print("CORS TEST COMPLETE")
    print("="*50)

if __name__ == "__main__":
    test_cors_fix()