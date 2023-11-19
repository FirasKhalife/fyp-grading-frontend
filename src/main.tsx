import ReactDOM from 'react-dom/client'
import { Theme, ThemeProvider, createTheme } from '@mui/material/styles';
import App from './App';

const theme: Theme = createTheme();


ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>
    <App />
  </ThemeProvider>,
)
