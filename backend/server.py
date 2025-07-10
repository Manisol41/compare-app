from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
import json

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

security = HTTPBearer()

# JWT Configuration
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Mock Data
MOCK_RESTAURANTS = [
    {
        "id": "1",
        "name": "McDonald's",
        "cuisine_type": "Fast Food",
        "image_url": "https://images.unsplash.com/photo-1555992336-03a23c73e0c6?w=400&h=300&fit=crop",
        "average_rating": 4.2,
        "estimated_delivery_time": "25-35 min",
        "location": "Downtown"
    },
    {
        "id": "2", 
        "name": "Pizza Hut",
        "cuisine_type": "Pizza",
        "image_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
        "average_rating": 4.1,
        "estimated_delivery_time": "30-40 min",
        "location": "Midtown"
    },
    {
        "id": "3",
        "name": "Burger King",
        "cuisine_type": "Fast Food", 
        "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
        "average_rating": 4.0,
        "estimated_delivery_time": "20-30 min",
        "location": "Downtown"
    },
    {
        "id": "4",
        "name": "Subway",
        "cuisine_type": "Sandwiches",
        "image_url": "https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=400&h=300&fit=crop",
        "average_rating": 4.3,
        "estimated_delivery_time": "15-25 min",
        "location": "Uptown"
    },
    {
        "id": "5",
        "name": "Domino's Pizza",
        "cuisine_type": "Pizza",
        "image_url": "https://images.unsplash.com/photo-1506354666786-959d6d497f1a?w=400&h=300&fit=crop",
        "average_rating": 4.2,
        "estimated_delivery_time": "20-30 min",
        "location": "Midtown"
    },
    {
        "id": "6",
        "name": "KFC",
        "cuisine_type": "Fast Food",
        "image_url": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&h=300&fit=crop",
        "average_rating": 4.1,
        "estimated_delivery_time": "25-35 min",
        "location": "Downtown"
    },
    {
        "id": "7",
        "name": "Taco Bell",
        "cuisine_type": "Mexican",
        "image_url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop",
        "average_rating": 4.0,
        "estimated_delivery_time": "20-30 min",
        "location": "Uptown"
    },
    {
        "id": "8",
        "name": "Panda Express",
        "cuisine_type": "Asian",
        "image_url": "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=300&fit=crop",
        "average_rating": 4.3,
        "estimated_delivery_time": "25-35 min",
        "location": "Midtown"
    }
]

MOCK_PRICES = {
    "1": [  # McDonald's
        {"platform": "DoorDash", "base_price": 12.99, "delivery_fee": 2.99, "service_fee": 1.50, "tax": 1.52, "total": 19.00},
        {"platform": "Uber Eats", "base_price": 12.99, "delivery_fee": 0.99, "service_fee": 2.00, "tax": 1.52, "total": 17.50},
        {"platform": "Grubhub", "base_price": 13.49, "delivery_fee": 3.49, "service_fee": 1.25, "tax": 1.62, "total": 19.85}
    ],
    "2": [  # Pizza Hut  
        {"platform": "DoorDash", "base_price": 18.99, "delivery_fee": 3.99, "service_fee": 2.50, "tax": 2.30, "total": 27.78},
        {"platform": "Uber Eats", "base_price": 17.99, "delivery_fee": 1.99, "service_fee": 2.75, "tax": 2.18, "total": 24.91},
        {"platform": "Grubhub", "base_price": 19.49, "delivery_fee": 4.49, "service_fee": 2.25, "tax": 2.37, "total": 28.60}
    ],
    "3": [  # Burger King
        {"platform": "DoorDash", "base_price": 11.49, "delivery_fee": 2.49, "service_fee": 1.75, "tax": 1.39, "total": 17.12},
        {"platform": "Uber Eats", "base_price": 10.99, "delivery_fee": 0.49, "service_fee": 1.50, "tax": 1.33, "total": 14.31},
        {"platform": "Grubhub", "base_price": 12.49, "delivery_fee": 3.99, "service_fee": 1.50, "tax": 1.51, "total": 19.49}
    ],
    "4": [  # Subway
        {"platform": "DoorDash", "base_price": 9.99, "delivery_fee": 1.99, "service_fee": 1.25, "tax": 1.21, "total": 14.44},
        {"platform": "Uber Eats", "base_price": 9.49, "delivery_fee": 0.99, "service_fee": 1.50, "tax": 1.15, "total": 13.13},
        {"platform": "Grubhub", "base_price": 10.49, "delivery_fee": 2.99, "service_fee": 1.00, "tax": 1.27, "total": 15.75}
    ],
    "5": [  # Domino's
        {"platform": "DoorDash", "base_price": 16.99, "delivery_fee": 3.49, "service_fee": 2.25, "tax": 2.06, "total": 24.79},
        {"platform": "Uber Eats", "base_price": 15.99, "delivery_fee": 1.49, "service_fee": 2.50, "tax": 1.94, "total": 21.92},
        {"platform": "Grubhub", "base_price": 17.49, "delivery_fee": 4.99, "service_fee": 2.00, "tax": 2.12, "total": 26.60}
    ],
    "6": [  # KFC
        {"platform": "DoorDash", "base_price": 14.99, "delivery_fee": 2.99, "service_fee": 1.75, "tax": 1.82, "total": 21.55},
        {"platform": "Uber Eats", "base_price": 13.99, "delivery_fee": 0.99, "service_fee": 2.25, "tax": 1.70, "total": 18.93},
        {"platform": "Grubhub", "base_price": 15.49, "delivery_fee": 3.99, "service_fee": 1.50, "tax": 1.88, "total": 22.86}
    ],
    "7": [  # Taco Bell
        {"platform": "DoorDash", "base_price": 8.99, "delivery_fee": 1.99, "service_fee": 1.25, "tax": 1.09, "total": 13.32},
        {"platform": "Uber Eats", "base_price": 8.49, "delivery_fee": 0.49, "service_fee": 1.50, "tax": 1.03, "total": 11.51},
        {"platform": "Grubhub", "base_price": 9.49, "delivery_fee": 2.99, "service_fee": 1.00, "tax": 1.15, "total": 14.63}
    ],
    "8": [  # Panda Express
        {"platform": "DoorDash", "base_price": 13.99, "delivery_fee": 2.49, "service_fee": 1.75, "tax": 1.70, "total": 19.93},
        {"platform": "Uber Eats", "base_price": 12.99, "delivery_fee": 0.99, "service_fee": 2.00, "tax": 1.58, "total": 17.56},
        {"platform": "Grubhub", "base_price": 14.49, "delivery_fee": 3.49, "service_fee": 1.50, "tax": 1.76, "total": 21.24}
    ]
}

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    first_name: str
    password_hash: str
    address: Optional[str] = None
    favorites: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: str
    first_name: str
    password: str
    address: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    address: Optional[str] = None
    favorites: List[str] = []

class Restaurant(BaseModel):
    id: str
    name: str
    cuisine_type: str
    image_url: str
    average_rating: float
    estimated_delivery_time: str
    location: str

class PlatformPrice(BaseModel):
    platform: str
    base_price: float
    delivery_fee: float
    service_fee: float
    tax: float
    total: float

class RestaurantPrices(BaseModel):
    restaurant: Restaurant
    prices: List[PlatformPrice]
    best_deal: PlatformPrice
    max_savings: float

class UserStats(BaseModel):
    total_saved: float
    comparisons_count: int
    favorites_count: int

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def find_best_deal(prices: List[PlatformPrice]) -> tuple:
    best_deal = min(prices, key=lambda x: x.total)
    max_price = max(prices, key=lambda x: x.total)
    max_savings = max_price.total - best_deal.total
    return best_deal, max_savings

# API Routes
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        first_name=user_data.first_name,
        password_hash=hashed_password,
        address=user_data.address
    )
    await db.users.insert_one(user.dict())
    
    return UserResponse(**user.dict())

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["id"]})
    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse(**user)}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse(**current_user.dict())

@api_router.get("/restaurants/search", response_model=List[Restaurant])
async def search_restaurants(q: Optional[str] = None, cuisine: Optional[str] = None, location: Optional[str] = None):
    restaurants = MOCK_RESTAURANTS.copy()
    
    if q:
        restaurants = [r for r in restaurants if q.lower() in r["name"].lower()]
    
    if cuisine:
        restaurants = [r for r in restaurants if cuisine.lower() in r["cuisine_type"].lower()]
        
    if location:
        restaurants = [r for r in restaurants if location.lower() in r["location"].lower()]
    
    return [Restaurant(**r) for r in restaurants]

@api_router.get("/restaurants/{restaurant_id}/prices", response_model=RestaurantPrices)
async def get_restaurant_prices(restaurant_id: str):
    restaurant_data = next((r for r in MOCK_RESTAURANTS if r["id"] == restaurant_id), None)
    if not restaurant_data:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    prices_data = MOCK_PRICES.get(restaurant_id, [])
    prices = [PlatformPrice(**p) for p in prices_data]
    
    if not prices:
        raise HTTPException(status_code=404, detail="No prices found for this restaurant")
    
    best_deal, max_savings = find_best_deal(prices)
    
    return RestaurantPrices(
        restaurant=Restaurant(**restaurant_data),
        prices=prices,
        best_deal=best_deal,
        max_savings=max_savings
    )

@api_router.post("/favorites/{restaurant_id}")
async def add_favorite(restaurant_id: str, current_user: User = Depends(get_current_user)):
    if restaurant_id not in current_user.favorites:
        current_user.favorites.append(restaurant_id)
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"favorites": current_user.favorites}}
        )
    return {"message": "Restaurant added to favorites"}

@api_router.delete("/favorites/{restaurant_id}")
async def remove_favorite(restaurant_id: str, current_user: User = Depends(get_current_user)):
    if restaurant_id in current_user.favorites:
        current_user.favorites.remove(restaurant_id)
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"favorites": current_user.favorites}}
        )
    return {"message": "Restaurant removed from favorites"}

@api_router.get("/favorites", response_model=List[Restaurant])
async def get_favorites(current_user: User = Depends(get_current_user)):
    favorite_restaurants = [Restaurant(**r) for r in MOCK_RESTAURANTS if r["id"] in current_user.favorites]
    return favorite_restaurants

@api_router.get("/user/stats", response_model=UserStats)
async def get_user_stats(current_user: User = Depends(get_current_user)):
    # Mock stats calculation
    total_saved = len(current_user.favorites) * 3.50  # Average savings per restaurant
    comparisons_count = len(current_user.favorites) * 2  # Mock comparison count
    
    return UserStats(
        total_saved=total_saved,
        comparisons_count=comparisons_count,
        favorites_count=len(current_user.favorites)
    )

@api_router.get("/")
async def root():
    return {"message": "Food Delivery Price Comparison API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
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