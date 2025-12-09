import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

if OPENROUTER_API_KEY:
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
    )
else:
    client = None

def explain_text(text: str, model: str = "tngtech/tng-r1t-chimera:free") -> str:
    """
    Sends text to OpenRouter for explanation/vulgarisation.
    """
    if not OPENROUTER_API_KEY or not client:
        return "Error: OpenRouter API Key not configured."

    prompt = f"""
    Tu es un expert pédagogique. Ta mission est d'expliquer ce texte scientifique à un étudiant de Master qui a des difficultés avec l'anglais et le jargon technique.
    
    Consignes :
    1. Traduis le sens général en français.
    2. Simplifie le vocabulaire complexe.
    3. Explicite les sous-entendus si nécessaire.
    4. Reste fidèle au fond scientifique (pas d'invention).
    
    Texte à expliquer :
    {text}
    """
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "Tu es un assistant scientifique pédagogique. Réponds toujours en formattage Markdown."},
                {"role": "user", "content": prompt}
            ],
            # extra_headers={
            #     "HTTP-Referer": "http://localhost:5173", # Optional
            #     "X-Title": "DeepRead", # Optional
            # }
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error communicating with AI: {str(e)}"
