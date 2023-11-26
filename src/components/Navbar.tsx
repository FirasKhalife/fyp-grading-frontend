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
import { useLocation, useNavigate } from 'react-router-dom';
import IReviewer from '../interface/IReviewer.view';
import INotification from '../interface/INotification.view';
import StringUtils from '../utils/StringUtils';
import NotificationService from '../services/NotificationService';

export default function Navbar(
    {user, notifications: receivedNotifs} : {user: IReviewer, notifications: INotification[]}
) {

  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = React.useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = React.useState<INotification[]>(receivedNotifs);

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

  const handleClickNotification = (notification: INotification) => {
    if (!notification.isRead) {
      NotificationService.readNotification(notification.id);

      localStorage.setItem('notifications', JSON.stringify(
        notifications.map(notif => { 
          if (notif.id === notification.id) notif.isRead = true; 
          return notif;
        })
      ));
    }

    navigate(`/teams`);
  }

  const handleMarkAllAsRead = () => {
    NotificationService.readAllNotifications();

    const readNotifs = notifications.map(notif => { 
      notif.isRead = true; 
      return notif;
    });
    localStorage.setItem('notifications', JSON.stringify(readNotifs));

    setNotifications(readNotifs);
  }

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
      sx={{
        '& .css-6hp17o-MuiList-root-MuiMenu-list' : {
          padding: '0 !important',
        }
      }}
    >
      {notifications.length === 0 ? (
        <MenuItem disabled sx={{"&.Mui-disabled": { opacity: 1 } }}>
          If you receive any notification, it will appear here.
        </MenuItem> 
      ) : (
        notifications.map((notif) => (
          <MenuItem 
            key={notif.id}
            sx={{
              backgroundColor: notif.isRead ? 'white' : 'rgb(230,240,255)',
              paddingY: '4px',
              paddingLeft: '4px',
              borderBottom: '1px solid rgb(240,240,240)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
            }}
            onClick={() => handleClickNotification(notif)}
          >
            <h5 style={{margin: 0, fontWeight: 500}}>
              {!notif.assessment ? (
              `Final grade for team ${notif.teamId} is ready.`
              ) : (
                `${StringUtils.snakeToTitle(notif.assessment)} grade for team ${notif.teamId} is ready.`
              )}
            </h5>
            {notif.gradeFinalizedAt && (
              <p
                style={{
                  margin: '0',
                  fontSize: '0.7rem',
                  height: 'fit-content',
                  color: 'rgb(80,160,200)',
                  cursor: 'pointer',
                }}
              >
                {notif.gradeFinalizedAt.toString()}
              </p>
            )}
          </MenuItem>
        ))
      )}
      {notifications.filter(notif => !notif.isRead).length != 0 && (
        <p 
        style={{
          margin: '2px',
          fontSize: '0.8rem',
          height: 'fit-content',
          color: 'rgb(80,160,200)',
          cursor: 'pointer',
        }}
        onClick={handleMarkAllAsRead}
      >
        Mark all as read
      </p>
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
            onClick={() => navigate(location.state?.previous || '/')}
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