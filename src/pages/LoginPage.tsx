import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Delete, ArrowLeft, User, LogIn } from 'lucide-react';
import { Logo } from '../assets/Logo';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { UserAvatar } from '../components/ui/UserAvatar';

type LoginStep = 'username' | 'pin';

export function LoginPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStep>('username');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [matchedUser, setMatchedUser] = useState<typeof state.users[0] | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeUsers = state.users.filter(u => u.isActive);

  useEffect(() => {
    if (step === 'username') {
      inputRef.current?.focus();
    }
  }, [step]);

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameError('Please enter your name');
      return;
    }

    const match = activeUsers.find(
      u => u.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (!match) {
      setUsernameError('No user found with that name');
      return;
    }

    setMatchedUser(match);
    setUsernameError('');
    setStep('pin');
    setPin('');
    setError(false);
  };

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
    if (!matchedUser) return;
    if (enteredPin === matchedUser.pin) {
      dispatch({
        type: 'SET_SESSION',
        payload: { userId: matchedUser.id, loggedInAt: new Date().toISOString() }
      });
      navigate('/');
    } else {
      setError(true);
      toast.error('Incorrect PIN');
    }
  };

  const handleBack = () => {
    setStep('username');
    setMatchedUser(null);
    setPin('');
    setError(false);
    setUsernameError('');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-gray-900 to-black flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <div className="flex flex-col items-center mb-12 animate-fade-in">
          <div className="p-4 rounded-2xl mb-4">
            <Logo size={80} light showText={false} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">GTA Scrub</h1>
          <p className="text-blue-200 mt-2 text-lg">Commercial Cleaning Management</p>
        </div>

        {step === 'username' && (
          <div className="w-full">
            <h2 className="text-center text-gray-400 text-sm font-medium uppercase tracking-widest mb-6">Sign In</h2>
            <form onSubmit={handleUsernameSubmit} className="space-y-4">
              <div>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setUsernameError(''); }}
                    placeholder="Enter your name"
                    className={`w-full pl-11 pr-4 py-3.5 bg-white/10 backdrop-blur-md border ${
                      usernameError ? 'border-red-400' : 'border-white/20'
                    } rounded-xl text-white placeholder-gray-400 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                    autoComplete="off"
                  />
                </div>
                {usernameError && (
                  <p className="text-red-400 text-sm mt-2 text-center">{usernameError}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
              >
                <LogIn size={20} />
                Continue
              </button>
            </form>
          </div>
        )}

        {step === 'pin' && matchedUser && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <button onClick={handleBack} className="self-start flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-6 text-sm">
              <ArrowLeft size={16} />
              Back
            </button>

            <UserAvatar user={matchedUser} size="lg" className="mb-4 shadow-lg" />
            <h2 className="text-xl font-semibold text-white mb-1">Welcome, {matchedUser.name.split(' ')[0]}</h2>
            <p className="text-gray-400 mb-8">Enter your 4-digit PIN</p>

            <div className={`flex gap-4 mb-8 ${error ? 'animate-shake' : ''}`}>
              {[0, 1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    pin.length > i 
                      ? 'bg-blue-500 scale-110 shadow-[0_0_8px_rgba(59,130,246,0.5)]' 
                      : 'bg-white/30'
                  } ${error ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''}`} 
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 w-full max-w-[240px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handlePinEntry(num.toString())}
                  className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-xl font-medium text-white transition-colors flex items-center justify-center mx-auto"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                onClick={() => handlePinEntry('0')}
                className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-xl font-medium text-white transition-colors flex items-center justify-center mx-auto"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-gray-400 transition-colors flex items-center justify-center mx-auto"
              >
                <Delete size={24} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
