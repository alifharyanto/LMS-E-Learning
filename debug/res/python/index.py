import os
from groq import Groq

# Inisialisasi client (ganti 'gsk_...' dengan API Key Groq milikmu)
client = Groq(
    api_key=os.environ.get("GROQ_API_KEY", "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")
)

try:
    # Mengambil daftar model dari API Groq
    models_page = client.models.list()
    
    print("=== Daftar Model Groq yang Tersedia ===")
    for model in models_page.data:
        print(f"- ID Model : {model.id}")
        print(f"  Pemilik  : {model.owned_by}\n")

except Exception as e:
    print(f"Gagal mengambil daftar model: {e}")