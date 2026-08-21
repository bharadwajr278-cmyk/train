from datetime import datetime
from pathlib import Path
import json,secrets,sqlite3
from urllib.parse import quote
from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel,Field
DB=Path(__file__).with_name('railvista.db');app=FastAPI(title='RailVista Booking API');app.add_middleware(CORSMiddleware,allow_origins=['http://localhost:3000','http://localhost:5173'],allow_methods=['*'],allow_headers=['*'])
class B(BaseModel):train_name:str;train_number:str;origin:str;destination:str;travel_date:str;passenger_name:str=Field(min_length=2);passenger_age:int=Field(ge=1,le=120);passenger_email:str=Field(min_length=5);amount:int
def db():c=sqlite3.connect(DB);c.row_factory=sqlite3.Row;c.execute('CREATE TABLE IF NOT EXISTS bookings(pnr TEXT PRIMARY KEY,payload TEXT,created_at TEXT)');return c
@app.get('/health')
def health():return {'status':'ok'}
@app.post('/api/bookings',status_code=201)
def book(x:B):
 pnr='RV'+''.join(str(secrets.randbelow(10)) for _ in range(10));data=x.model_dump()|{'pnr':pnr,'status':'CONFIRMED','seat':'C2-34'}
 with db() as c:c.execute('INSERT INTO bookings VALUES(?,?,?)',(pnr,json.dumps(data),datetime.utcnow().isoformat()))
 return data
@app.get('/api/bookings/{pnr}/qr')
def qr(pnr:str):
 with db() as c:r=c.execute('SELECT payload FROM bookings WHERE pnr=?',(pnr,)).fetchone()
 data=json.loads(r['payload']) if r else {'pnr':pnr,'status':'DEMO'}
 value=json.dumps({'pnr':pnr,'train':data.get('train_number'),'status':data.get('status')})
 return RedirectResponse('https://api.qrserver.com/v1/create-qr-code/?size=220x220&data='+quote(value))
