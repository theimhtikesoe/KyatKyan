'use client';

import { useState, useEffect } from 'react';

const CORRECT_PIN = '126365';

export default function PINLogin({ onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const authenticated = localStorage.getItem('pinAuthenticated');
    if (authenticated === 'true') {
      setIsAuthenticated(true);
      onSuccess?.();
    } else {
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, [onSuccess]);

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (pin === CORRECT_PIN) {
      localStorage.setItem('pinAuthenticated', 'true');
      setIsAuthenticated(true);
      setPin('');
      setError('');
      onSuccess?.();
    } else {
      setError('PIN code မှားနေပါသည်။ ထပ်မံ ကြိုးစားကြည့်ပါ။');
      setPin('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pinAuthenticated');
    setIsAuthenticated(false);
    setPin('');
    setError('');
  };

  // Don't render anything while loading
  if (isLoading) {
    return null;
  }

  // Don't render PIN login if authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">New Life Ledger</h1>
          <p className="text-gray-600">PIN code ထည့်သွင်းပါ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
              6-Digit PIN Code
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={handlePinChange}
              placeholder="• • • • • •"
              maxLength="6"
              className="w-full px-4 py-3 text-center text-2xl tracking-widest border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={pin.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
          >
            ဝင်ရောက်ပါ
          </button>
        </form>


      </div>
    </div>
  );
}
