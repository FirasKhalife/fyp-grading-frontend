import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { ArrowBack } from '@mui/icons-material';
import AuthService from '../services/AuthService';
import { snakeToTitle } from '../utils/snakeToTitle';
import { useLocation, useNavigate } from 'react-router-dom';
import IReviewer from '../interface/IReviewer.view';
import INotification from '../interface/INotification.view';

export default function Navbar(
    {user, notifications} : {user: IReviewer, notifications: INotification[]}
) {

  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = React.useState<null | HTMLElement>(null);

  const isMenuOpen = Boolean(menuAnchorEl);
  const isNotificationsMenuOpen = Boolean(notificationsAnchorEl);

  const location = useLocation();
  const navigate = useNavigate();

  const navbarLocation = 
  `FYP Grading - 
    ${(location.pathname.split('/')[1].charAt(0).toUpperCase() 
     + location.pathname.split('/')[1].substring(1)) || 'Home'}`;

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleNotificationsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleNotificationsMenuClose = () => {
    setNotificationsAnchorEl(null);
  };

  const menuId = 'primary-search-account-menu';
  const renderMenu = (
    <Menu
      anchorEl={menuAnchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem disabled sx={{"&.Mui-disabled": { opacity: 1 } }}>
        {`${user.firstName} ${user.lastName}`}
      </MenuItem>
      <MenuItem 
        onClick={() => AuthService.logout(navigate)}
        sx={{color: 'rgb(80,160,200)'}}
      >
        Logout
      </MenuItem>
    </Menu>
  );

  const notificationMenuId = 'primary-search-account-notification-menu';
  const renderNotificationsMenu = (
    <Menu
      anchorEl={notificationsAnchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      id={notificationMenuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isNotificationsMenuOpen}
      onClose={handleNotificationsMenuClose}
    >
      {notifications.length === 0 ? (
        <MenuItem disabled sx={{"&.Mui-disabled": { opacity: 1 } }}>
          If you receive any notification, it will appear here.
        </MenuItem> 
      ) : (
        notifications.map((notif) => (
          <MenuItem 
            key={notif.id}
            onClick={() => navigate('/grades/${notif.team.id}')}
          >
            {!notif.assessment ? (
              `Final grade for team ${notif.teamId} is ready.`
            ) : (
              `${snakeToTitle(notif.assessment)} grade for team ${notif.teamId} is ready.`
            )}
          </MenuItem>
        ))
      )}
    </Menu>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ 
        position: 'static',
        height: '4rem',
      }} />
      <AppBar 
        position="fixed"
        sx={{
          height: '4rem',
          backgroundColor: 'rgb(117,185,231)',
        }}
      >
        <Toolbar>
        {location.pathname == '/' ? (
          <Box sx={{width: '2.5rem'}}/>
        ) : (
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="open drawer"
            sx={{ mr: 2 }}
            onClick={() => navigate(-1)}
          >
            <ArrowBack />
          </IconButton>
        )}
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ display: 'block' }}
          >
            {navbarLocation} 
          </Typography>
          
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex' }}>
            {user.isAdmin && (
              <IconButton
                size="large"
                edge="end"
                aria-controls={notificationMenuId}
                aria-haspopup="true"
                onClick={handleNotificationsMenuOpen}
                color="inherit"
              >
                {notifications.length === 0 ? (
                <NotificationsIcon />
                ) : (
                  <Badge badgeContent={notifications.filter(notif => !notif.isRead).length} color="error">
                    <NotificationsIcon />
                  </Badge>
                )}
              </IconButton>
            )}
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls={menuId}
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      {renderMenu}
      {renderNotificationsMenu}
    </Box>
  );
}