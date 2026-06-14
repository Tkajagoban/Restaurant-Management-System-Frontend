import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock } from 'react-icons/fi';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';
import './login.css';
import { useAuth } from '../../../contexts/AuthContext';
import { postLogin } from '../../../api/login/Login.api';
import loginBg from '../../../assets/new_backround.png';
import { GiChefToque } from 'react-icons/gi';
import { FaConciergeBell } from 'react-icons/fa';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setAuthAfterLogin, isAuthenticated } = useAuth();
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {

    console.log({ isAuthenticated });

    e.preventDefault();
    setError('');

    // Validate empty fields
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;

    }

    // Delegate authentication to context


    try {
      const response = await postLogin({ email, password });
      console.log('Login successful:', response);
      console.log('DEBUG: Full response.data:', JSON.stringify(response.data, null, 2));
      console.log('DEBUG: rolePrivilege from backend:', response.data?.rolePrivilege);

      // Log each privilege detail
      if (response.data?.rolePrivilege) {
        Object.entries(response.data.rolePrivilege).forEach(([key, value]) => {
          console.log(`Privilege "${key}":`, value);
        });
      }

      if (response.data?.accessToken) {
        setAuthAfterLogin({
          token: response.data.accessToken,
          rolePrivileges: response.data.rolePrivileges,
          userPrivileges: response.data.userPrivileges,
          rolePrivilege: response.data.rolePrivilege,
          userPrivilege: response.data.userPrivilege,
          roleId: response.data.roleId,
          userId: response.data.userId,
        });
      }
      if (response?.statusCode === 2000 || response?.statusCode === 200) {
        navigate('/dashboard');
      }

    } catch (error) {
      console.error('Login failed:', error);
      setError('Login failed. Please check your credentials and try again.');
    }
  };



  return (
    <div className="login-page-wrapper" style={{ backgroundImage: `url(${loginBg})` }}>
      {/* Background Overlay */}
      <div className="login-overlay"></div>

      {/* Left Branding Section */}
      <div className="login-branding-section">
        {/* Chef Icon */}
        <div className="chef-icon-container">
          <div className="chef-hat">👨‍🍳</div>
          
        
        </div>

        {/* Main Branding */}
        <div className="branding-content">
          <p className="branding-intro">Hey it's</p>
          <h1 className="branding-name">Delicious</h1>
          <p className="branding-restaurant">RESTAURANT</p>
          
          {/* Decorative Line */}
          <div className="branding-divider"></div>
          
          {/* Tagline */}
          <p className="branding-tagline">⭐⭐ Premium Dining Experience ⭐⭐</p>
          
          {/* Description */}
          <p className="branding-description">
            Smart Restaurant Management System<br />
            for orders, billing, tables and kitchen.
          </p>
        </div>
      </div>

      {/* Right Login Section */}
      <div className="login-form-section">
        <div className="login-card">
          {/* Icon & Welcome */}
          <div className="welcome-section">
            <div className="brand-logo">
  <GiChefToque className="chef-icon"/>
  <FaConciergeBell className="tray-icon"/>
</div>
            <h1 className="welcome-title">Welcome <span className="highlight">Back!</span></h1>
            <p className="welcome-subtitle">Login to access your restaurant dashboard</p>
          </div>

          {/* Error Message */}
          {error && <div className="error-message">⚠️ {error}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon"><FiMail size={18} /></span>
                <input
                  type="email"
                  className="input-field"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <span className="input-icon"><FiLock size={18} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field password-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="forgot-password-container">
              <Link to="/forgot-password" className="forgot-link">
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <button type="submit" className="login-btn">
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;

