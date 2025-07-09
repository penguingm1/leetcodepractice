# FastAPI + PostgreSQL Backend Setup for Notes

## 1. Install PostgreSQL
- Download: https://www.postgresql.org/download/
- Create a database, e.g., `codingpractice`
- Create a user and password (or use default `postgres`)

## 2. Install Python Dependencies
```bash
pip install fastapi[all] sqlalchemy asyncpg psycopg2-binary
```

## 3. FastAPI Backend Code (`main.py`)
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, String, Text
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:yourpassword@localhost/codingpractice"
)

engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

class Note(Base):
    __tablename__ = 'notes'
    problem_id = Column(String, primary_key=True, index=True)
    note = Column(Text)

class NoteIn(BaseModel):
    note: str

app = FastAPI()

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/notes/{problem_id}")
async def get_note(problem_id: str):
    async with SessionLocal() as session:
        result = await session.get(Note, problem_id)
        return {"note": result.note if result else ""}

@app.post("/notes/{problem_id}")
async def save_note(problem_id: str, note_in: NoteIn):
    async with SessionLocal() as session:
        note = await session.get(Note, problem_id)
        if note:
            note.note = note_in.note
        else:
            note = Note(problem_id=problem_id, note=note_in.note)
            session.add(note)
        await session.commit()
        return {"status": "success"}
```

## 4. Run the API
```bash
uvicorn main:app --reload
```

## 5. Example Frontend JS
```js
async function loadNoteForProblem(problem) {
    const res = await fetch(`/notes/${encodeURIComponent(problem.title)}`);
    const data = await res.json();
    document.getElementById('notesEditor').innerHTML = data.note || '';
}

async function saveNoteForProblem(problem) {
    const note = document.getElementById('notesEditor').innerHTML;
    await fetch(`/notes/${encodeURIComponent(problem.title)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
    });
    document.getElementById('notesStatus').textContent = 'Saved!';
    setTimeout(() => {
        document.getElementById('notesStatus').textContent = '';
    }, 1200);
}
```

---
You can use this file to set up your backend when you’re ready! 