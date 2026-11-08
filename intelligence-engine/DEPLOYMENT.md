# Python Backend Deployment (Fly.io)

## Prerequisites
- flyctl (`curl -L https://fly.io/install.sh | sh`)
- Fly.io account

## Deploy
```sh
cd python-backend
fly auth login
fly apps create lifeos-intel-backend
fly deploy
```

## Local
```sh
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
