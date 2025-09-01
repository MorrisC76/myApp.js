from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
import base64
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
JWT_SECRET = "your-secret-key-here-change-in-production"
JWT_ALGORITHM = "HS256"

# Enums
class RSVPStatus(str, Enum):
    GOING = "going"
    MAYBE = "maybe"
    NOT_GOING = "not_going"

class EventCategory(str, Enum):
    CONFERENCE = "conference"
    PARTY = "party"
    MEETUP = "meetup"
    WORKSHOP = "workshop"
    NETWORKING = "networking"
    SOCIAL = "social"
    SPORTS = "sports"
    MUSIC = "music"
    OTHER = "other"

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    full_name: str
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    bio: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    created_at: datetime

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    date: datetime
    location: str
    capacity: Optional[int] = None
    category: EventCategory
    price: Optional[float] = None
    requirements: Optional[str] = None
    contact_info: str
    images: List[str] = []
    host_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventCreate(BaseModel):
    title: str
    description: str
    date: datetime
    location: str
    capacity: Optional[int] = None
    category: EventCategory
    price: Optional[float] = None
    requirements: Optional[str] = None
    contact_info: str

class EventResponse(BaseModel):
    id: str
    title: str
    description: str
    date: datetime
    location: str
    capacity: Optional[int] = None
    category: EventCategory
    price: Optional[float] = None
    requirements: Optional[str] = None
    contact_info: str
    images: List[str] = []
    host_id: str
    host_name: str
    created_at: datetime
    total_going: int = 0
    total_maybe: int = 0
    total_guests: int = 0
    user_rsvp: Optional[RSVPStatus] = None
    user_guest_count: int = 0

class RSVP(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    user_id: str
    status: RSVPStatus
    guest_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RSVPCreate(BaseModel):
    status: RSVPStatus
    guest_count: int = 0

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    user_id: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: str
    event_id: str
    user_id: str
    username: str
    full_name: str
    content: str
    created_at: datetime

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    payload = {"user_id": user_id, "exp": datetime.now(timezone.utc).timestamp() + 86400}  # 24 hours
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth Routes
@api_router.post("/auth/register", response_model=Dict[str, Any])
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"$or": [{"email": user_data.email}, {"username": user_data.username}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email or username already exists")
    
    # Hash password and create user
    user_dict = user_data.dict()
    user_dict['password'] = hash_password(user_data.password)
    user = User(**{k: v for k, v in user_dict.items() if k != 'password'})
    
    # Save to database
    await db.users.insert_one({**user.dict(), "password": user_dict['password']})
    
    # Create token
    token = create_jwt_token(user.id)
    
    return {"user": UserResponse(**user.dict()), "token": token}

@api_router.post("/auth/login", response_model=Dict[str, Any])
async def login(login_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc or not verify_password(login_data.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    token = create_jwt_token(user_doc['id'])
    user = User(**user_doc)
    
    return {"user": UserResponse(**user.dict()), "token": token}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(**current_user.dict())

# Event Routes
@api_router.post("/events", response_model=EventResponse)
async def create_event(event_data: EventCreate, current_user: User = Depends(get_current_user)):
    event_dict = event_data.dict()
    event_dict['host_id'] = current_user.id
    event = Event(**event_dict)
    
    await db.events.insert_one(event.dict())
    
    # Return event with host info
    response_data = event.dict()
    response_data['host_name'] = current_user.full_name
    response_data['total_going'] = 0
    response_data['total_maybe'] = 0
    response_data['total_guests'] = 0
    
    return EventResponse(**response_data)

@api_router.get("/events", response_model=List[EventResponse])
async def get_events(current_user: User = Depends(get_current_user)):
    events = await db.events.find().to_list(1000)
    response_events = []
    
    for event_doc in events:
        # Get host info
        host = await db.users.find_one({"id": event_doc['host_id']})
        host_name = host['full_name'] if host else "Unknown"
        
        # Get RSVP stats
        rsvps = await db.rsvps.find({"event_id": event_doc['id']}).to_list(1000)
        total_going = sum(1 for r in rsvps if r['status'] == 'going')
        total_maybe = sum(1 for r in rsvps if r['status'] == 'maybe')
        total_guests = sum(r['guest_count'] for r in rsvps if r['status'] == 'going')
        
        # Get user's RSVP
        user_rsvp = next((r for r in rsvps if r['user_id'] == current_user.id), None)
        user_rsvp_status = user_rsvp['status'] if user_rsvp else None
        user_guest_count = user_rsvp['guest_count'] if user_rsvp else 0
        
        response_data = {
            **event_doc,
            'host_name': host_name,
            'total_going': total_going,
            'total_maybe': total_maybe,
            'total_guests': total_guests,
            'user_rsvp': user_rsvp_status,
            'user_guest_count': user_guest_count
        }
        response_events.append(EventResponse(**response_data))
    
    return response_events

@api_router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, current_user: User = Depends(get_current_user)):
    event_doc = await db.events.find_one({"id": event_id})
    if not event_doc:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get host info
    host = await db.users.find_one({"id": event_doc['host_id']})
    host_name = host['full_name'] if host else "Unknown"
    
    # Get RSVP stats
    rsvps = await db.rsvps.find({"event_id": event_id}).to_list(1000)
    total_going = sum(1 for r in rsvps if r['status'] == 'going')
    total_maybe = sum(1 for r in rsvps if r['status'] == 'maybe')
    total_guests = sum(r['guest_count'] for r in rsvps if r['status'] == 'going')
    
    # Get user's RSVP
    user_rsvp = next((r for r in rsvps if r['user_id'] == current_user.id), None)
    user_rsvp_status = user_rsvp['status'] if user_rsvp else None
    user_guest_count = user_rsvp['guest_count'] if user_rsvp else 0
    
    response_data = {
        **event_doc,
        'host_name': host_name,
        'total_going': total_going,
        'total_maybe': total_maybe,
        'total_guests': total_guests,
        'user_rsvp': user_rsvp_status,
        'user_guest_count': user_guest_count
    }
    
    return EventResponse(**response_data)

# RSVP Routes
@api_router.post("/events/{event_id}/rsvp")
async def create_or_update_rsvp(event_id: str, rsvp_data: RSVPCreate, current_user: User = Depends(get_current_user)):
    # Check if event exists
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if RSVP already exists
    existing_rsvp = await db.rsvps.find_one({"event_id": event_id, "user_id": current_user.id})
    
    if existing_rsvp:
        # Update existing RSVP
        await db.rsvps.update_one(
            {"id": existing_rsvp['id']},
            {"$set": {
                "status": rsvp_data.status,
                "guest_count": rsvp_data.guest_count,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    else:
        # Create new RSVP
        rsvp = RSVP(
            event_id=event_id,
            user_id=current_user.id,
            status=rsvp_data.status,
            guest_count=rsvp_data.guest_count
        )
        await db.rsvps.insert_one(rsvp.dict())
    
    return {"message": "RSVP updated successfully"}

# Comment Routes
@api_router.post("/events/{event_id}/comments", response_model=CommentResponse)
async def create_comment(event_id: str, comment_data: CommentCreate, current_user: User = Depends(get_current_user)):
    # Check if event exists
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    comment = Comment(
        event_id=event_id,
        user_id=current_user.id,
        content=comment_data.content
    )
    
    await db.comments.insert_one(comment.dict())
    
    return CommentResponse(
        **comment.dict(),
        username=current_user.username,
        full_name=current_user.full_name
    )

@api_router.get("/events/{event_id}/comments", response_model=List[CommentResponse])
async def get_comments(event_id: str, current_user: User = Depends(get_current_user)):
    comments = await db.comments.find({"event_id": event_id}).to_list(1000)
    response_comments = []
    
    for comment_doc in comments:
        user = await db.users.find_one({"id": comment_doc['user_id']})
        username = user['username'] if user else "Unknown"
        full_name = user['full_name'] if user else "Unknown"
        
        response_comments.append(CommentResponse(
            **comment_doc,
            username=username,
            full_name=full_name
        ))
    
    return response_comments

# Image upload route
@api_router.post("/events/{event_id}/images")
async def upload_event_image(event_id: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    # Check if event exists and user owns it
    event = await db.events.find_one({"id": event_id, "host_id": current_user.id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or access denied")
    
    # Read file and convert to base64
    file_content = await file.read()
    file_base64 = base64.b64encode(file_content).decode('utf-8')
    image_url = f"data:{file.content_type};base64,{file_base64}"
    
    # Add image to event
    await db.events.update_one(
        {"id": event_id},
        {"$push": {"images": image_url}}
    )
    
    return {"message": "Image uploaded successfully", "image_url": image_url}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()