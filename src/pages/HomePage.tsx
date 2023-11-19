import { useLoaderData, useNavigate } from "react-router-dom";
import Home from "../components/Home";
import Navbar from "../components/Navbar";
import IReviewer from "../interface/IReviewer.view";
import ITeam from "../interface/ITeam.view";
import isAdmin from "../utils/auth/isAdmin";

interface IHomeData {
  user: IReviewer;
  teamsPromise: Promise<ITeam[]>;
}

export default function HomePage() {

  const navigate = useNavigate();
  const {user, teamsPromise} = useLoaderData() as IHomeData;

  return (
    <>
      <Navbar user={user} navigate={navigate}/>
      <Home user={user} isAdmin={isAdmin(user)} teamsPromise={teamsPromise}/>
    </>
  );
}