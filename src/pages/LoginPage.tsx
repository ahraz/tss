import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Delete } from 'lucide-react';
import { Logo } from '../assets/Logo';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { UserAvatar } from '../components/ui/UserAvatar';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export function LoginPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const activeUsers = state.users.filter(u => u.isActive);
  const selectedUser = activeUsers.find(u => u.id === selectedUserId);

  const handlePinEntry = (digit: string) => {
    if (error) {
      setError(false);
      setPin(digit);
      return;
    }
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    if (error) {
      setError(false);
      setPin('');
      return;
    }
    setPin(p => p.slice(0, -1));
  };

  const verifyPin = (enteredPin: string) => {
    if (!selectedUser) return;
    if (enteredPin === selectedUser.pin) {
      dispatch({
        type: 'SET_SESSION',
        payload: { userId: selectedUser.id, loggedInAt: new Date().toISOString() }
      });
      navigate('/');
    } else {
      setError(true);
      toast.error('Incorrect PIN');
    }
  };

  const handleClose = () => {
    setSelectedUserId(null);
    setPin('');
    setError(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-gray-900 to-black flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        <div className="flex flex-col items-center mb-12 animate-fade-in">
          <div className="p-4 rounded-2xl mb-4">
            <Logo size={80} light showText={false} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">THE SCRUB SQUAD</h1>
          <p className="text-blue-200 mt-2 text-lg">Professional Cleaning Management</p>
        </div>

        <div className="w-full">
          <h2 className="text-center text-gray-400 text-sm font-medium uppercase tracking-widest mb-6">Select your profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {activeUsers.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className="bg-white/10 hover:bg-white/15 active:bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-200 text-left flex items-center gap-4 group"
              >
                <UserAvatar user={user} size="lg" className="shadow-lg" />
                <div>
                  <h3 className="text-white font-semibold text-lg group-hover:text-blue-300 transition-colors">{user.name}</h3>
                  <Badge 
                    label={user.role} 
                    variant={user.role === 'owner' ? 'warning' : user.role === 'partner' ? 'info' : 'neutral'} 
                    className="mt-1 bg-black/30 text-xs border-none"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={!!selectedUserId} onClose={handleClose} size="sm">
        {selectedUser && (
          <div className="flex flex-col items-center pb-4">
            <UserAvatar user={selectedUser} size="lg" className="mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Welcome, {selectedUser.name.split(' ')[0]}</h3>
            <p className="text-sm text-gray-500 mb-8">Enter your 4-digit PIN</p>

            <div className={`flex gap-4 mb-8 ${error ? 'animate-shake' : ''}`}>
              {[0, 1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    pin.length > i 
                      ? 'bg-blue-600 scale-110 shadow-[0_0_8px_rgba(37,99,235,0.5)]' 
                      : 'bg-gray-200'
                  } ${error ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''}`} 
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 w-full max-w-[240px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handlePinEntry(num.toString())}
                  className="w-16 h-16 rounded-full bg-gray-50 hover:bg-blue-50 active:bg-blue-100 text-xl font-medium text-gray-900 transition-colors flex items-center justify-center mx-auto"
                >
                  {num}
                </button>
              ))}
              <div /> {/* Empty space for bottom row alignment */}
              <button
                onClick={() => handlePinEntry('0')}
                className="w-16 h-16 rounded-full bg-gray-50 hover:bg-blue-50 active:bg-blue-100 text-xl font-medium text-gray-900 transition-colors flex items-center justify-center mx-auto"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="w-16 h-16 rounded-full bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-600 transition-colors flex items-center justify-center mx-auto"
              >
                <Delete size={24} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
