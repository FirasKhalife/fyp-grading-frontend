import { useLoaderData, useLocation, useNavigate } from "react-router-dom";
import Home from "../components/Home";
import Navbar from "../components/Navbar";
import IReviewer from "../interface/IReviewer.view";
import ITeam from "../interface/ITeam.view";
import isAdmin from "../utils/auth/isAdmin";
import INotification from "../interface/INotification.view";

interface IHomeData {
  user: IReviewer;
  teams: ITeam[];
  notifications: INotification[]
}

export default function HomePage() {

  const navigate = useNavigate();
  const location = useLocation();
  const {user, teams, notifications} = useLoaderData() as IHomeData;

  return (
    <>
      <Navbar user={user} navigate={navigate} location={location}/>
      <Home user={user} isAdmin={isAdmin(user)} teams={teams} notifications={notifications}/>
    </>
  );
}