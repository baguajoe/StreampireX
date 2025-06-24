# ✅ utils/revelator_api.py
import requests
import os

def submit_release_to_revelator(track):
    try:
        api_url = "https://api.revelator.com/v1/releases"  # Replace with real URL
        api_key = os.getenv("REVELATOR_API_KEY")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "title": track.title,
            "artist": track.artist_name,
            "genre": track.genre,
            "release_date": track.release_date.strftime("%Y-%m-%d") if track.release_date else None,
            "explicit": track.is_explicit,
            "audio_url": track.audio_url,  # Must be public URL if required
            "cover_url": track.cover_url,
            "user_reference": track.id  # Optional for tracking
        }

        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("external_id")  # Save this in DB for tracking

    except Exception as e:
        print(f"Revelator API Error: {str(e)}")
        return None
