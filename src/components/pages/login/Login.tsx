import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock } from 'react-icons/fi';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';
import './login.css';
import { useAuth } from '../../../contexts/AuthContext';
import { postLogin } from '../../../api/login/Login.api';
import logo from '../../../assets/logo.png';
import loginBg from '../../../assets/login_bg.png';

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
    <div className="login-page-wrapper">
      <div 
        className="login-image-section"
        style={{ backgroundImage: `url(${loginBg})` }}
      ></div>
      <div className="login-form-section">
        <div className="login-card">
          {/* Logo & Title */}
          <div className="logo-section">
            <img src={logo} alt="இது நம்ம கடை" />
            <h1 className="title">இது நம்ம கடை</h1>
            <p className="subtitle tamil-font">Premium Dining Experience</p>
          </div>

          {/* Error Message */}
          {error && <div className="error-message">⚠️ {error}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">Enter your email</label>
              <div className="input-wrapper">
                <span className="input-icon"><FiMail size={18} /></span>
                <input
                  type="email"
                  className="input-field"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label">Enter your password</label>
              <div className="input-wrapper">
                <span className="input-icon"><FiLock size={18} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field password-input"
                  placeholder="••••••••"
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
            <div className="forgot-password">
              <Link to="/forgot-password" className="forgot-link">
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <button type="submit" className="login-btn">
              Login
            </button>
          </form>

          {/* Footer */}
          <div className="footer">
            <p className="footer-text">
              Powered by <span className="footer-highlight">இது நம்ம கடை</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

