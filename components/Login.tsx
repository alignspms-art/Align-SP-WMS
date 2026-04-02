import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, EyeOff, Eye, Loader2, AlertCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/overview" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username || !password) {
      setErrorMsg("Required: Username and Password");
      return;
    }

    setLoading(true);
    try {
      const result = await login(username, password);
      if (!result.success) {
        setErrorMsg(result.message || "Invalid credentials");
      }
    } catch (err) {
      setErrorMsg("Authentication service unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#D1D5DB]">
      <div className="w-full max-w-[440px] bg-white rounded-lg shadow-2xl p-12 flex flex-col items-center">
        
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 tracking-wider">ALIGN</h1>
        </div>
        
        {errorMsg && (
          <div className="w-full mb-6 p-3 bg-red-50 border border-red-100 rounded-md flex items-center space-x-2 text-red-600">
            <AlertCircle size={16} />
            <span className="text-xs font-medium">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2D808E] focus:border-[#2D808E] text-sm"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={18} className="text-gray-400" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2D808E] focus:border-[#2D808E] text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#2D808E] text-white font-medium text-sm rounded transition-colors hover:bg-[#256b78] disabled:opacity-70 flex items-center justify-center space-x-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            <span>{loading ? 'Logging in...' : 'Log in'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
