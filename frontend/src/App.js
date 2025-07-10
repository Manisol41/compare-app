import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set up axios defaults
axios.defaults.baseURL = API;

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentPage, setCurrentPage] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [priceComparison, setPriceComparison] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Food categories with images
  const foodCategories = [
    {
      name: 'Fast Food',
      image: 'https://images.unsplash.com/photo-1627955280978-f54fff2f316a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxjdWlzaW5lJTIwdHlwZXN8ZW58MHx8fHwxNzUyMTE2OTUzfDA&ixlib=rb-4.1.0&q=85',
      cuisineType: 'Fast Food'
    },
    {
      name: 'Pizza',
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
      cuisineType: 'Pizza'
    },
    {
      name: 'Mexican',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
      cuisineType: 'Mexican'
    },
    {
      name: 'Asian',
      image: 'https://images.unsplash.com/photo-1644647849404-bba4739704e3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwzfHxjdWlzaW5lJTIwdHlwZXN8ZW58MHx8fHwxNzUyMTE2OTUzfDA&ixlib=rb-4.1.0&q=85',
      cuisineType: 'Asian'
    },
    {
      name: 'Sandwiches',
      image: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=400&h=300&fit=crop',
      cuisineType: 'Sandwiches'
    },
    {
      name: 'All Food',
      image: 'https://images.unsplash.com/photo-1578960281840-cb36759fb109?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwyfHxmb29kJTIwY2F0ZWdvcmllc3xlbnwwfHx8fDE3NTIxMTY5NDd8MA&ixlib=rb-4.1.0&q=85',
      cuisineType: ''
    }
  ];

  // Set up axios interceptor for auth
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/auth/me');
      setUser(response.data);
      fetchFavorites();
      fetchUserStats();
    } catch (error) {
      console.error('Error fetching user profile:', error);
      handleLogout();
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await axios.get('/favorites');
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await axios.get('/user/stats');
      setUserStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setCurrentPage('home');
      fetchFavorites();
      fetchUserStats();
    } catch (error) {
      alert('Login failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleRegister = async (email, firstName, password, address) => {
    try {
      const response = await axios.post('/auth/register', {
        email,
        first_name: firstName,
        password,
        address
      });
      alert('Registration successful! Please login.');
      setCurrentPage('login');
    } catch (error) {
      alert('Registration failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentPage('home');
    setFavorites([]);
    setUserStats(null);
  };

  const searchRestaurants = async (cuisineFilter = null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (cuisineFilter || selectedCuisine) params.append('cuisine', cuisineFilter || selectedCuisine);
      
      const response = await axios.get(`/restaurants/search?${params}`);
      setRestaurants(response.data);
      setCurrentPage('results');
    } catch (error) {
      console.error('Error searching restaurants:', error);
      alert('Error searching restaurants');
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceComparison = async (restaurantId) => {
    setLoading(true);
    try {
      const response = await axios.get(`/restaurants/${restaurantId}/prices`);
      setPriceComparison(response.data);
      setSelectedRestaurant(response.data.restaurant);
      setCurrentPage('comparison');
    } catch (error) {
      console.error('Error fetching price comparison:', error);
      alert('Error fetching price comparison');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (restaurantId) => {
    if (!user) {
      alert('Please login to add favorites');
      return;
    }

    try {
      const isFavorite = favorites.some(fav => fav.id === restaurantId);
      
      if (isFavorite) {
        await axios.delete(`/favorites/${restaurantId}`);
      } else {
        await axios.post(`/favorites/${restaurantId}`);
      }
      
      fetchFavorites();
      fetchUserStats();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Error updating favorites');
    }
  };

  const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      handleLogin(email, password);
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Login
            </button>
          </form>
          <p className="text-center mt-4">
            Don't have an account?{' '}
            <button
              onClick={() => setCurrentPage('register')}
              className="text-blue-600 hover:underline"
            >
              Register
            </button>
          </p>
        </div>
      </div>
    );
  };

  const RegisterForm = () => {
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [password, setPassword] = useState('');
    const [address, setAddress] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      handleRegister(email, firstName, password, address);
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-center mb-6">Register</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Address (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Register
            </button>
          </form>
          <p className="text-center mt-4">
            Already have an account?{' '}
            <button
              onClick={() => setCurrentPage('login')}
              className="text-blue-600 hover:underline"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    );
  };

  const Header = () => (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 
              className="text-2xl font-bold text-gray-900 cursor-pointer"
              onClick={() => setCurrentPage('home')}
            >
              🍕 FoodCompare
            </h1>
          </div>
          <nav className="flex items-center space-x-4">
            {user ? (
              <>
                <button
                  onClick={() => setCurrentPage('favorites')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ❤️ Favorites
                </button>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  📊 Dashboard
                </button>
                <span className="text-gray-600">Hi, {user.first_name}!</span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => setCurrentPage('login')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Login
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );

  const HomePage = () => (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Compare Food Delivery Prices
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Find the best deals across Wolt, Foody, and Bolt
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Search restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => searchRestaurants()}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Searching...' : '🔍 Search'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Food Categories */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Browse by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {foodCategories.map((category, index) => (
              <div
                key={index}
                onClick={() => searchRestaurants(category.cuisineType)}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-24 object-cover"
                />
                <div className="p-3">
                  <h4 className="font-semibold text-gray-900 text-center text-sm">
                    {category.name}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Restaurants Preview */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Popular Restaurants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "McDonald's", image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop" },
              { name: "Pizza Hut", image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop" },
              { name: "KFC", image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop" },
              { name: "Subway", image: "https://images.unsplash.com/photo-1547584370-2cc98b8b8dc8?w=400&h=300&fit=crop" }
            ].map((restaurant, index) => (
              <div
                key={index}
                onClick={() => {
                  setSearchQuery(restaurant.name);
                  searchRestaurants();
                }}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              >
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="w-full h-32 object-cover"
                />
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 text-center">
                    {restaurant.name}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );

  const SearchResults = () => (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Search Results ({restaurants.length})
          </h2>
          <button
            onClick={() => setCurrentPage('home')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Search
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <div key={restaurant.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img
                src={restaurant.image_url}
                alt={restaurant.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{restaurant.name}</h3>
                <p className="text-gray-600 mb-2">{restaurant.cuisine_type}</p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-yellow-500">⭐ {restaurant.average_rating}</span>
                  <span className="text-gray-500">🕒 {restaurant.estimated_delivery_time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => fetchPriceComparison(restaurant.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Compare Prices
                  </button>
                  <button
                    onClick={() => toggleFavorite(restaurant.id)}
                    className={`p-2 rounded-full ${
                      favorites.some(fav => fav.id === restaurant.id)
                        ? 'text-red-500 hover:text-red-600'
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    ❤️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );

  const PriceComparison = () => (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Price Comparison</h2>
          <button
            onClick={() => setCurrentPage('results')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Results
          </button>
        </div>

        {priceComparison && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-6">
              <img
                src={selectedRestaurant.image_url}
                alt={selectedRestaurant.name}
                className="w-16 h-16 object-cover rounded-lg mr-4"
              />
              <div>
                <h3 className="text-xl font-semibold">{selectedRestaurant.name}</h3>
                <p className="text-gray-600">
                  ⭐ {selectedRestaurant.average_rating} | 🕒 {selectedRestaurant.estimated_delivery_time}
                </p>
              </div>
              <button
                onClick={() => toggleFavorite(selectedRestaurant.id)}
                className={`ml-auto p-2 rounded-full ${
                  favorites.some(fav => fav.id === selectedRestaurant.id)
                    ? 'text-red-500 hover:text-red-600'
                    : 'text-gray-400 hover:text-red-500'
                }`}
              >
                ❤️
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {priceComparison.prices.map((price, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    price.platform === priceComparison.best_deal.platform
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{price.platform}</h4>
                    {price.platform === priceComparison.best_deal.platform && (
                      <span className="bg-green-500 text-white px-2 py-1 rounded text-sm">
                        💰 BEST DEAL
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Food:</span>
                      <span>${price.base_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery:</span>
                      <span>${price.delivery_fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service:</span>
                      <span>${price.service_fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${price.tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>${price.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Order from {price.platform}
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-green-100 border border-green-400 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">💰 Savings Alert!</h4>
              <p className="text-green-700">
                You save <strong>${priceComparison.max_savings.toFixed(2)}</strong> by ordering from{' '}
                <strong>{priceComparison.best_deal.platform}</strong> instead of the most expensive option!
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );

  const Favorites = () => (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Favorites</h2>
        
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💔</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No favorites yet</h3>
            <p className="text-gray-600 mb-6">Start adding restaurants to your favorites to see them here!</p>
            <button
              onClick={() => setCurrentPage('home')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Discover Restaurants
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((restaurant) => (
              <div key={restaurant.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <img
                  src={restaurant.image_url}
                  alt={restaurant.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">{restaurant.name}</h3>
                  <p className="text-gray-600 mb-2">{restaurant.cuisine_type}</p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-yellow-500">⭐ {restaurant.average_rating}</span>
                    <span className="text-gray-500">🕒 {restaurant.estimated_delivery_time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => fetchPriceComparison(restaurant.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Compare Prices
                    </button>
                    <button
                      onClick={() => toggleFavorite(restaurant.id)}
                      className="text-red-500 hover:text-red-600 p-2 rounded-full"
                    >
                      ❤️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );

  const Dashboard = () => (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Welcome back, {user?.first_name}! 👋</h2>
        
        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="text-3xl mr-4">💰</div>
                <div>
                  <h3 className="text-lg font-semibold">Total Saved</h3>
                  <p className="text-2xl font-bold text-green-600">${userStats.total_saved.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="text-3xl mr-4">🔍</div>
                <div>
                  <h3 className="text-lg font-semibold">Comparisons</h3>
                  <p className="text-2xl font-bold text-blue-600">{userStats.comparisons_count}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="text-3xl mr-4">❤️</div>
                <div>
                  <h3 className="text-lg font-semibold">Favorites</h3>
                  <p className="text-2xl font-bold text-red-600">{userStats.favorites_count}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setCurrentPage('home')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔍 Search Restaurants
              </button>
              <button
                onClick={() => setCurrentPage('favorites')}
                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                ❤️ View Favorites
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Your Favorites</h3>
            {favorites.length === 0 ? (
              <p className="text-gray-500">No favorites yet. Start exploring!</p>
            ) : (
              <div className="space-y-2">
                {favorites.slice(0, 3).map((restaurant) => (
                  <div key={restaurant.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium">{restaurant.name}</span>
                    <button
                      onClick={() => fetchPriceComparison(restaurant.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Compare →
                    </button>
                  </div>
                ))}
                {favorites.length > 3 && (
                  <button
                    onClick={() => setCurrentPage('favorites')}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View all {favorites.length} favorites →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );

  // Loading screen
  if (loading && currentPage !== 'home') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render based on current page
  switch (currentPage) {
    case 'login':
      return <LoginForm />;
    case 'register':
      return <RegisterForm />;
    case 'results':
      return <SearchResults />;
    case 'comparison':
      return <PriceComparison />;
    case 'favorites':
      return <Favorites />;
    case 'dashboard':
      return <Dashboard />;
    default:
      return <HomePage />;
  }
};

export default App;