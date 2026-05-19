import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
VAULT_PATH = os.getenv("VAULT_PATH", "/opt/assistant-bot/vault")
ADMIN_ID = int(os.getenv("ADMIN_ID", "0"))
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

# Development mode: when True, bot uses vault-dev instead of vault
DEV_MODE = False
ACTIVE_VAULT = "/opt/assistant-bot/vault-dev" if DEV_MODE else VAULT_PATH
