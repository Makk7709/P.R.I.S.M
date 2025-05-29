import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def query_perplexity(prompt):
    """
    Make a request to the Perplexity API with proper error handling
    
    Args:
        prompt (str): The user's prompt to send to the API
        
    Returns:
        dict: The API response as a dictionary
        
    Raises:
        ValueError: If API key is missing
        requests.exceptions.RequestException: If API request fails
    """
    api_key = os.getenv('PERPLEXITY_API_KEY')
    if not api_key:
        raise ValueError("PERPLEXITY_API_KEY not found in environment variables")

    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    # Construct the payload according to Perplexity API specifications
    data = {
        "model": "sonar-pro",
        "messages": [
            {
                "role": "system",
                "content": "Be precise and concise."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7,
        "max_tokens": 1000,
        "stream": False
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        
        # Check for HTTP errors
        if response.status_code != 200:
            error_message = f"API request failed with status {response.status_code}"
            try:
                error_details = response.json()
                error_message += f": {json.dumps(error_details, indent=2)}"
            except:
                error_message += f": {response.text}"
            raise requests.exceptions.RequestException(error_message)
            
        return response.json()
        
    except requests.exceptions.RequestException as e:
        print(f"Error making request: {str(e)}")
        raise

if __name__ == "__main__":
    prompt = "Quels sont les avantages de l'intelligence artificielle dans le secteur médical ?"
    try:
        result = query_perplexity(prompt)
        print("\nAPI Response:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"\nError: {str(e)}") 