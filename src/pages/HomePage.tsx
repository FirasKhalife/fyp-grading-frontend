import { useLoaderData } from "react-router-dom";
import Home from "../components/Home";
import IReviewer from "../interface/IReviewer.view";
import ITeam from "../interface/ITeam.view";
import Navbar from "../components/Navbar";
import INotification from "../interface/INotification.view";

interface IHomeData {
  user: IReviewer;
  teams: ITeam[];
  notifications: INotification[]
}

export default function HomePage() {

  const {user, teams, notifications} = useLoaderData() as IHomeData;

  return (
    <>
      <Navbar user={user} notifications={notifications} />
      <Home user={user} teams={teams}/>
    </>
  );
}