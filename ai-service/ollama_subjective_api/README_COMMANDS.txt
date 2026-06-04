STUDYFLOW SUBJECTIVE API - RUN COMMANDS

1) Put this folder here:
   studyflow/ai-service/ollama_subjective_api

2) Open PowerShell:
   cd C:\Users\obaid\Downloads\studyflow\studyflow\ai-service\ollama_subjective_api

3) Create venv:
   py -3.11 -m venv .venv

4) Activate venv:
   .\.venv\Scripts\activate

5) Install packages:
   pip install -r requirements.txt

6) Make sure Ollama is running and models exist:
   ollama serve
   ollama pull llama3.2:3b
   ollama pull nomic-embed-text

7) Run API:
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8017

8) Test health in browser:
   http://127.0.0.1:8017/api/v1/health

9) Laravel will call:
   POST http://127.0.0.1:8017/api/v1/subjective/file
