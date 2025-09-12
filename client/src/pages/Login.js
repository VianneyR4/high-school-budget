import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider
} from '@mui/material';
import { AccountBalance, Security } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      if (result.user.role === 'USER') {
        navigate('/my-courses');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const handleIdpLogin = () => {
    // Open IDP integration page in a new window
    window.open('http://localhost:8080/idp-widget/index.html', 'idp-login', 'width=600,height=700,scrollbars=yes,resizable=yes');
  };

  // function AuthWidget() { 
  //   const [user, setUser] = useState(null); 
  //   const [tokens, setTokens] = useState(null); 
  //   const widgetRef = useRef(null); 
  //   const containerRef = useRef(null); 
  //   useEffect(() => { 
  //     if (containerRef.current && !widgetRef.current) {
  //       widgetRef.current = new IdPWidget({ 
  //         containerId: containerRef.current.id, 
  //         apiBaseUrl: process.env.REACT_APP_IDP_URL, 
  //         clientId: process.env.REACT_APP_CLIENT_ID, 
  //         onSuccess: (user, tokens) => { 
  //           // Update React state setUser(user); 
  //           setTokens(tokens); 
  //         }, 
  //         onError: (error) => { 
  //           console.error('Auth error:', error); 
  //         } 
  //       }); 
  //     } 
  //   }, []); 
  //   return ( 
  //     <div> 
  //       <div ref={containerRef} id="react-idp-widget"></div> 
  //       {user && <p>Welcome, {user.email}!</p>} 
  //     </div> 
  //   );
  // }

  
  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <AccountBalance sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
            <Typography component="h1" variant="h4" gutterBottom>
              School Budget Management
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
              Sign in to manage your department's budget and resources
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>

              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  OR
                </Typography>
              </Divider>


              {/* <script src="https://your-cdn.com/idp-widget/idp-widget.js"></script> 
              <div id="idp-widget"></div> 
              <script> 
                    const widget = new IdPWidget({
                        containerId: 'idp-widget',
                        apiBaseUrl: 'https://your-idp.com/api',
                        clientId: 'your-client-id',
                        onSuccess: (user, tokens) => {
                            // Handle successful authentication 
                            console.log('User logged in:', user);
                        }, onError: (error) => {
                            // Handle authentication errors 
                            console.error('Auth error:', error);
                        }
                    }); 
                </script>
               */}
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Security />}
                onClick={handleIdpLogin}
                sx={{ mb: 2 }}
                disabled={loading}
              >
                Sign In with Identity Provider
              </Button>
            </Box>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, width: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Demo Accounts:
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Course</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Access Level</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Password</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>ADMIN</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>admin@school.edu</TableCell>
                      <TableCell>Full system access</TableCell>
                      <TableCell>password</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>DEPT_HEAD</TableCell>
                      <TableCell>Math</TableCell>
                      <TableCell>math.head@school.edu</TableCell>
                      <TableCell>Department management</TableCell>
                      <TableCell>password</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>DEPT_HEAD</TableCell>
                      <TableCell>Science</TableCell>
                      <TableCell>science.head@school.edu</TableCell>
                      <TableCell>Department management</TableCell>
                      <TableCell>password</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>DEPT_HEAD</TableCell>
                      <TableCell>English</TableCell>
                      <TableCell>english.head@school.edu</TableCell>
                      <TableCell>Department management</TableCell>
                      <TableCell>password</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>TEACHER</TableCell>
                      <TableCell>Math</TableCell>
                      <TableCell>alice.smith@school.edu</TableCell>
                      <TableCell>Course scheduling</TableCell>
                      <TableCell>password</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>TEACHER</TableCell>
                      <TableCell>Science</TableCell>
                      <TableCell>bob.wilson@school.edu</TableCell>
                      <TableCell>Course scheduling</TableCell>
                      <TableCell>password</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>USER</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>user@school.edu</TableCell>
                      <TableCell>Basic access & reporting</TableCell>
                      <TableCell>password</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
