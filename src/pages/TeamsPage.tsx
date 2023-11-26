import { useLoaderData } from "react-router-dom";
import IReviewer from "../interface/IReviewer.view";
import Navbar from "../components/Navbar";
import ITeamGrades from "../interface/ITeamsGrades.view";
import TeamsGrades from "../components/TeamsGrades";

interface ITeamsData {
  user: IReviewer;
  teamsGrades: ITeamGrades[];
}

export default function EvaluationPage() {

  const {user, teamsGrades} = useLoaderData() as ITeamsData;

  const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');

  return (
    <>
      <Navbar user={user} notifications={notifications}/>
      <TeamsGrades teamsGrades={teamsGrades}/>
    </>
  );
}