import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Context for authentication
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { user, token } = response.data;
      
      setUser(user);
      setToken(token);
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { user, token } = response.data;
      
      setUser(user);
      setToken(token);
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Login Component
const LoginForm = ({ onToggle }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-purple-200">Sign in to join amazing events</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-purple-200 text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-purple-200 text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-purple-200">
            Don't have an account?{' '}
            <button
              onClick={onToggle}
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Register Component
const RegisterForm = ({ onToggle }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    bio: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await register(formData);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Join EventHub</h1>
          <p className="text-purple-200">Create your account to start hosting events</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-purple-200 text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Choose a username"
              required
            />
          </div>

          <div>
            <label className="block text-purple-200 text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Your full name"
              required
            />
          </div>

          <div>
            <label className="block text-purple-200 text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-purple-200 text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Create a password"
              required
            />
          </div>

          <div>
            <label className="block text-purple-200 text-sm font-medium mb-2">Bio (Optional)</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Tell us about yourself"
              rows="3"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-purple-200">
            Already have an account?{' '}
            <button
              onClick={onToggle}
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const EventHub = () => {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const heroImages = [
    'https://images.unsplash.com/photo-1528782322959-37d194f50b34',
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655',
    'https://images.unsplash.com/photo-1671576193244-964fe85e1797',
    'https://images.unsplash.com/photo-1604668915840-580c30026e5f',
    'https://images.unsplash.com/photo-1608433348878-e43dea08b910',
    'https://images.pexels.com/photos/28747036/pexels-photo-28747036.jpeg',
    'https://images.pexels.com/photos/972377/pexels-photo-972377.jpeg',
    'https://images.unsplash.com/photo-1692261929431-253094ad8497'
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`);
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (eventId, status, guestCount) => {
    try {
      await axios.post(`${API}/events/${eventId}/rsvp`, {
        status,
        guest_count: parseInt(guestCount) || 0
      });
      await fetchEvents(); // Refresh events to update RSVP counts
    } catch (error) {
      console.error('Failed to RSVP:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">EventHub</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-purple-200">Welcome, {user?.full_name}</span>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
              >
                Create Event
              </button>
              <button
                onClick={logout}
                className="text-purple-200 hover:text-white transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Discover Amazing Events
          </h2>
          <p className="text-xl text-purple-200 mb-8 max-w-3xl mx-auto">
            Join local events, meet new people, and create unforgettable memories. 
            From conferences to parties, find your perfect event today.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
            {heroImages.slice(0, 4).map((image, index) => (
              <div key={index} className="rounded-lg overflow-hidden shadow-lg">
                <img 
                  src={image} 
                  alt={`Event ${index + 1}`}
                  className="w-full h-32 object-cover hover:scale-105 transition duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-white mb-8">Upcoming Events</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                onRSVP={handleRSVP}
                onClick={setSelectedEvent}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Create Event Modal */}
      {showCreateForm && (
        <CreateEventModal 
          onClose={() => setShowCreateForm(false)}
          onEventCreated={fetchEvents}
        />
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal 
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRSVP={handleRSVP}
        />
      )}
    </div>
  );
};

// Event Card Component
const EventCard = ({ event, onRSVP, onClick }) => {
  const [rsvpStatus, setRsvpStatus] = useState(event.user_rsvp || '');
  const [guestCount, setGuestCount] = useState(event.user_guest_count || 0);
  const [showRSVP, setShowRSVP] = useState(false);

  const handleRSVPSubmit = async () => {
    if (rsvpStatus) {
      await onRSVP(event.id, rsvpStatus, guestCount);
      setShowRSVP(false);
    }
  };

  const getRandomImage = () => {
    const images = [
      'https://images.unsplash.com/photo-1528782322959-37d194f50b34',
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655',
      'https://images.unsplash.com/photo-1671576193244-964fe85e1797',
      'https://images.unsplash.com/photo-1604668915840-580c30026e5f',
      'https://images.unsplash.com/photo-1608433348878-e43dea08b910'
    ];
    return images[Math.floor(Math.random() * images.length)];
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden shadow-xl border border-white/20 hover:transform hover:scale-105 transition duration-300">
      <div className="relative">
        <img 
          src={event.images[0] || getRandomImage()} 
          alt={event.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
          {event.category}
        </div>
      </div>
      
      <div className="p-6">
        <h4 className="text-xl font-bold text-white mb-2">{event.title}</h4>
        <p className="text-purple-200 mb-4 line-clamp-2">{event.description}</p>
        
        <div className="space-y-2 text-sm text-purple-200 mb-4">
          <div>📅 {new Date(event.date).toLocaleDateString()}</div>
          <div>📍 {event.location}</div>
          <div>👤 Hosted by {event.host_name}</div>
          {event.price && <div>💰 ${event.price}</div>}
        </div>

        <div className="flex justify-between items-center mb-4 text-sm text-purple-200">
          <span>🎯 {event.total_going} Going</span>
          <span>❓ {event.total_maybe} Maybe</span>
          <span>👥 {event.total_guests} Guests</span>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => onClick(event)}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition duration-200"
          >
            View Details
          </button>
          <button
            onClick={() => setShowRSVP(!showRSVP)}
            className={`flex-1 px-4 py-2 rounded-lg transition duration-200 ${
              event.user_rsvp 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {event.user_rsvp ? `RSVP'd: ${event.user_rsvp}` : 'RSVP'}
          </button>
        </div>

        {showRSVP && (
          <div className="mt-4 p-4 bg-white/10 rounded-lg">
            <div className="space-y-3">
              <div>
                <label className="block text-purple-200 text-sm mb-2">Your Response</label>
                <select
                  value={rsvpStatus}
                  onChange={(e) => setRsvpStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                >
                  <option value="">Select Response</option>
                  <option value="going">Going</option>
                  <option value="maybe">Maybe</option>
                  <option value="not_going">Not Going</option>
                </select>
              </div>
              
              {rsvpStatus === 'going' && (
                <div>
                  <label className="block text-purple-200 text-sm mb-2">Number of Guests</label>
                  <input
                    type="number"
                    min="0"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  />
                </div>
              )}
              
              <button
                onClick={handleRSVPSubmit}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded transition duration-200"
              >
                Update RSVP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Create Event Modal Component
const CreateEventModal = ({ onClose, onEventCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    capacity: '',
    category: 'social',
    price: '',
    requirements: '',
    contact_info: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const eventData = {
        ...formData,
        date: new Date(formData.date).toISOString(),
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        price: formData.price ? parseFloat(formData.price) : null
      };

      await axios.post(`${API}/events`, eventData);
      onEventCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full max-h-90vh overflow-y-auto border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-white">Create New Event</h3>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white transition duration-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">Event Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="social">Social</option>
                <option value="conference">Conference</option>
                <option value="party">Party</option>
                <option value="meetup">Meetup</option>
                <option value="workshop">Workshop</option>
                <option value="networking">Networking</option>
                <option value="sports">Sports</option>
                <option value="music">Music</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-purple-200 text-sm font-medium mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">Date & Time</label>
              <input
                type="datetime-local"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">Capacity (Optional)</label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">Price (Optional)</label>
              <input
                type="number"
                step="0.01"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-purple-200 text-sm font-medium mb-2">Contact Information</label>
            <input
              type="text"
              name="contact_info"
              value={formData.contact_info}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-purple-200 text-sm font-medium mb-2">Requirements (Optional)</label>
            <textarea
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white py-3 rounded-lg transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Event Detail Modal Component
const EventDetailModal = ({ event, onClose, onRSVP }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState(event.user_rsvp || '');
  const [guestCount, setGuestCount] = useState(event.user_guest_count || 0);

  useEffect(() => {
    fetchComments();
  }, [event.id]);

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API}/events/${event.id}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await axios.post(`${API}/events/${event.id}/comments`, {
        content: newComment
      });
      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const handleRSVPSubmit = async () => {
    if (rsvpStatus) {
      await onRSVP(event.id, rsvpStatus, guestCount);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-4xl w-full max-h-90vh overflow-y-auto border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-3xl font-bold text-white">{event.title}</h3>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white transition duration-200 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Event Details */}
          <div>
            <img 
              src={event.images[0] || 'https://images.unsplash.com/photo-1528782322959-37d194f50b34'} 
              alt={event.title}
              className="w-full h-64 object-cover rounded-lg mb-6"
            />

            <div className="space-y-4 text-purple-200">
              <div><strong className="text-white">Description:</strong> {event.description}</div>
              <div><strong className="text-white">Date:</strong> {new Date(event.date).toLocaleString()}</div>
              <div><strong className="text-white">Location:</strong> {event.location}</div>
              <div><strong className="text-white">Host:</strong> {event.host_name}</div>
              <div><strong className="text-white">Category:</strong> {event.category}</div>
              {event.price && <div><strong className="text-white">Price:</strong> ${event.price}</div>}
              {event.capacity && <div><strong className="text-white">Capacity:</strong> {event.capacity}</div>}
              {event.requirements && <div><strong className="text-white">Requirements:</strong> {event.requirements}</div>}
              <div><strong className="text-white">Contact:</strong> {event.contact_info}</div>
            </div>

            {/* RSVP Section */}
            <div className="mt-6 p-4 bg-white/10 rounded-lg">
              <h4 className="text-white font-bold mb-4">RSVP</h4>
              <div className="flex justify-between text-sm text-purple-200 mb-4">
                <span>🎯 {event.total_going} Going</span>
                <span>❓ {event.total_maybe} Maybe</span>
                <span>👥 {event.total_guests} Total Guests</span>
              </div>

              <div className="space-y-3">
                <select
                  value={rsvpStatus}
                  onChange={(e) => setRsvpStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                >
                  <option value="">Select Response</option>
                  <option value="going">Going</option>
                  <option value="maybe">Maybe</option>
                  <option value="not_going">Not Going</option>
                </select>
                
                {rsvpStatus === 'going' && (
                  <div>
                    <label className="block text-purple-200 text-sm mb-2">Number of Guests</label>
                    <input
                      type="number"
                      min="0"
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                    />
                  </div>
                )}
                
                <button
                  onClick={handleRSVPSubmit}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded transition duration-200"
                >
                  Update RSVP
                </button>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div>
            <h4 className="text-white font-bold mb-4">Comments</h4>
            
            <form onSubmit={handleCommentSubmit} className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows="3"
              />
              <button
                type="submit"
                className="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition duration-200"
              >
                Post Comment
              </button>
            </form>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-white/10 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">{comment.full_name}</span>
                    <span className="text-purple-300 text-sm">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-purple-200">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Auth Flow Component
const AuthFlow = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <>
      {isLogin ? (
        <LoginForm onToggle={() => setIsLogin(false)} />
      ) : (
        <RegisterForm onToggle={() => setIsLogin(true)} />
      )}
    </>
  );
};

// Main App
function App() {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
}

const AuthWrapper = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return user ? <EventHub /> : <AuthFlow />;
};

export default App;