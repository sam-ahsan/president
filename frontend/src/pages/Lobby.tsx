import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import type { Room } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export default function Lobby() {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/');
    }
    loadRooms();
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, [navigate, isAuthenticated]);

  const loadRooms = async () => {
    try {
      const response = await fetch(`${API_URL}/api/rooms`);
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!roomName.trim()) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: roomName, maxPlayers })
      });
      
      const data = await response.json();
      if (response.ok) {
        navigate(`/room/${data.id}`);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const joinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Lobby</h1>
          <div className="text-gray-400">Welcome, {user?.username}</div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Room */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <h2 className="text-2xl font-bold mb-4">Create Room</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Room name"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              />
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              >
                <option value={4}>4 Players</option>
                <option value={6}>6 Players</option>
                <option value={8}>8 Players</option>
                <option value={10}>10 Players</option>
                <option value={12}>12 Players</option>
              </select>
              <button
                onClick={createRoom}
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold text-white"
              >
                Create Room
              </button>
            </div>
          </motion.div>

          {/* Join Room */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <h2 className="text-2xl font-bold mb-4">Join Room</h2>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading rooms...</div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No rooms available</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => joinRoom(room.id)}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition"
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="font-semibold">{room.name}</div>
                        <div className="text-sm text-gray-400">
                          {room.currentPlayers}/{room.maxPlayers} players
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-green-400">Waiting</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
