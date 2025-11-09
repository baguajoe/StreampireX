import requests
import xml.etree.ElementTree as ET
import os

class SteamService:
    """Enhanced Steam integration with API Key support"""
    
    API_BASE_URL = "http://api.steampowered.com"
    COMMUNITY_URL = "http://steamcommunity.com"
    STEAM_API_KEY = os.getenv('STEAM_API_KEY')
    
    @staticmethod
    def get_player_profile_xml(steam_id):
        """
        Get basic player profile using XML (no API key needed)
        Fallback method if API fails
        """
        try:
            url = f"{SteamService.COMMUNITY_URL}/profiles/{steam_id}/?xml=1"
            response = requests.get(url, timeout=10)
            
            if response.status_code != 200:
                return None
            
            root = ET.fromstring(response.content)
            
            return {
                'steam_id': root.find('steamID64').text if root.find('steamID64') is not None else steam_id,
                'persona_name': root.find('steamID').text if root.find('steamID') is not None else None,
                'avatar_url': root.find('avatarFull').text if root.find('avatarFull') is not None else None,
                'avatar_medium': root.find('avatarMedium').text if root.find('avatarMedium') is not None else None,
                'avatar_icon': root.find('avatarIcon').text if root.find('avatarIcon') is not None else None,
                'profile_url': f"http://steamcommunity.com/profiles/{steam_id}",
                'online_status': root.find('onlineState').text if root.find('onlineState') is not None else 'offline',
                'location': root.find('location').text if root.find('location') is not None else None,
                'member_since': root.find('memberSince').text if root.find('memberSince') is not None else None,
            }
            
        except Exception as e:
            print(f"Steam XML error: {str(e)}")
            return None
    
    @staticmethod
    def get_player_summary(steam_id):
        """
        Get player summary using Steam API (requires API key)
        Returns enhanced profile data
        """
        if not SteamService.STEAM_API_KEY:
            print("No Steam API key found, falling back to XML")
            return SteamService.get_player_profile_xml(steam_id)
        
        try:
            url = f"{SteamService.API_BASE_URL}/ISteamUser/GetPlayerSummaries/v0002/"
            params = {
                'key': SteamService.STEAM_API_KEY,
                'steamids': steam_id
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('response') and data['response'].get('players'):
                player = data['response']['players'][0]
                
                return {
                    'steam_id': player.get('steamid'),
                    'persona_name': player.get('personaname'),
                    'avatar_url': player.get('avatarfull'),
                    'avatar_medium': player.get('avatarmedium'),
                    'avatar_icon': player.get('avatar'),
                    'profile_url': player.get('profileurl'),
                    'online_status': SteamService._get_persona_state(player.get('personastate', 0)),
                    'real_name': player.get('realname'),
                    'country_code': player.get('loccountrycode'),
                    'state_code': player.get('locstatecode'),
                    'time_created': player.get('timecreated'),
                    'last_logoff': player.get('lastlogoff'),
                    'game_extra_info': player.get('gameextrainfo'),  # Currently playing
                }
            
            return None
            
        except Exception as e:
            print(f"Steam API error: {str(e)}, falling back to XML")
            return SteamService.get_player_profile_xml(steam_id)
    
    @staticmethod
    def get_owned_games(steam_id):
        """Get list of games owned by user"""
        if not SteamService.STEAM_API_KEY:
            return None
        
        try:
            url = f"{SteamService.API_BASE_URL}/IPlayerService/GetOwnedGames/v0001/"
            params = {
                'key': SteamService.STEAM_API_KEY,
                'steamid': steam_id,
                'include_appinfo': 1,
                'include_played_free_games': 1,
                'format': 'json'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('response'):
                games = data['response'].get('games', [])
                game_count = data['response'].get('game_count', 0)
                
                # Calculate total hours
                total_minutes = sum(game.get('playtime_forever', 0) for game in games)
                total_hours = round(total_minutes / 60, 1)
                
                # Get top 5 most played
                sorted_games = sorted(games, key=lambda x: x.get('playtime_forever', 0), reverse=True)
                top_games = sorted_games[:5]
                
                return {
                    'game_count': game_count,
                    'total_hours': total_hours,
                    'top_games': [
                        {
                            'name': game.get('name'),
                            'hours': round(game.get('playtime_forever', 0) / 60, 1),
                            'appid': game.get('appid')
                        }
                        for game in top_games if game.get('name')
                    ]
                }
            
            return None
            
        except Exception as e:
            print(f"Steam API error getting games: {str(e)}")
            return None
    
    @staticmethod
    def get_recently_played_games(steam_id, count=5):
        """Get recently played games"""
        if not SteamService.STEAM_API_KEY:
            return None
        
        try:
            url = f"{SteamService.API_BASE_URL}/IPlayerService/GetRecentlyPlayedGames/v0001/"
            params = {
                'key': SteamService.STEAM_API_KEY,
                'steamid': steam_id,
                'count': count,
                'format': 'json'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('response'):
                games = data['response'].get('games', [])
                return [
                    {
                        'name': game.get('name'),
                        'hours_2weeks': round(game.get('playtime_2weeks', 0) / 60, 1),
                        'hours_total': round(game.get('playtime_forever', 0) / 60, 1),
                        'appid': game.get('appid')
                    }
                    for game in games if game.get('name')
                ]
            
            return []
            
        except Exception as e:
            print(f"Steam API error getting recent games: {str(e)}")
            return []
    
    @staticmethod
    def get_complete_profile(steam_id):
        """Get complete Steam profile with all data"""
        profile = SteamService.get_player_summary(steam_id)
        
        if not profile:
            return None
        
        # Add games data if API key is available
        if SteamService.STEAM_API_KEY:
            owned_games = SteamService.get_owned_games(steam_id)
            recent_games = SteamService.get_recently_played_games(steam_id)
            
            if owned_games:
                profile['games_owned'] = owned_games.get('game_count', 0)
                profile['total_hours'] = owned_games.get('total_hours', 0)
                profile['top_games'] = owned_games.get('top_games', [])
            
            if recent_games:
                profile['recently_played'] = recent_games
        
        return profile
    
    @staticmethod
    def _get_persona_state(state):
        """Convert persona state number to readable string"""
        states = {
            0: 'offline',
            1: 'online',
            2: 'busy',
            3: 'away',
            4: 'snooze',
            5: 'looking to trade',
            6: 'looking to play'
        }
        return states.get(state, 'offline')
    
    @staticmethod
    def verify_steam_id(steam_id):
        """Check if Steam ID is valid"""
        profile = SteamService.get_player_summary(steam_id)
        return profile is not None