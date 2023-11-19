import React, { useEffect } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Checkbox, FormControlLabel } from '@mui/material';
import IAuth from '../interface/IAuth.view';
import IErrorResult from '../interface/ILoginResult.view';
import AuthService from '../services/AuthService';
import IJwtResponse from '../interface/IJwtResponse.view';

const defaultTheme = createTheme();

export default function Login() {

  const [auth, setAuth] = React.useState<IAuth>({email: '', password: ''});
  const [loginResult, setLoginResult] = React.useState<IErrorResult>({message: '', status: 0});
  const [remember, setRemember] = React.useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = React.useState<boolean>(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const retrievedEmail = localStorage.getItem("email");
    if (retrievedEmail && retrievedEmail !== 'undefined') {
      const email: string = JSON.parse(retrievedEmail);
      setAuth(prev => ({...prev, email: email}));
      document.getElementById('password')?.focus();
      setRemember(true);
    }

  }, []);

  useEffect(() => {
    if (location.pathname !== '/login')
      navigate('/login');

  }, [location, navigate]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);
    if (!auth.email || !auth.password)
      return;

    AuthService.login(auth)
    .then(({response, data} : {response: Response, data: unknown}) => {

      if (!response.ok) {
        setLoginResult(
          {
            message: response.status == 401 ? "Invalid email or password" : "Unexpected error, please try again later",
            status: response.status
          }
        );
        return;
      }

      const jwtResponse = data as IJwtResponse;
      setLoginResult({message: 'Login successful', status: 200});
      localStorage.setItem('user', JSON.stringify(jwtResponse));

      if (remember)
        localStorage.setItem('email', JSON.stringify(jwtResponse.email));
      else
        localStorage.removeItem('email');
      
      if (location.state && location.state.previousPage)
        navigate(location.state.previousPage);
      else
        navigate('/');
    });
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="xs">
        {loginResult.status != 0 &&
          <Alert 
            severity={loginResult.status === 200 ? 'success' : 'error'}
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translate(-50%, 0)", 
              width: "fit-content"
            }}
          >
            {loginResult.message}
          </Alert>
        }
        <Box
          sx={{
            paddingTop: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5">
            Sign in
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
              error={isSubmitted && !auth.email}
              helperText={isSubmitted && !auth.email ? 'Please enter your email' : ''}
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={auth.email}
              onChange={(event) => setAuth(prev => ({...prev, email: event.target.value}))}
            />
            <TextField
              error={isSubmitted && !auth.password}
              helperText={isSubmitted && !auth.password ? 'Please enter your password' : ''}
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={auth.password}
              onChange={(event) => setAuth(prev => ({...prev, password: event.target.value}))}
            />
            <FormControlLabel
              control={
                <Checkbox 
                  color="primary"
                  checked={remember}
                  onChange={() => setRemember(prev => !prev)}
                />
              }
              label="Remember me"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign In
            </Button>
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}