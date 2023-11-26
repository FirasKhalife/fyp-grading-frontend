import { useLoaderData } from "react-router-dom";
import Home from "../components/Home";
import IReviewer from "../interface/IReviewer.view";
import Navbar from "../components/Navbar";
import INotification from "../interface/INotification.view";
import IReviewerTeamsAssessments from "../interface/IReviewerTeamsAssessments.view";

interface IHomeData {
  user: IReviewer;
  reviewerTeamsAssessments: IReviewerTeamsAssessments;
  notifications: INotification[]
}

export default function HomePage() {

  const {user, reviewerTeamsAssessments, notifications} = useLoaderData() as IHomeData;

  return (
    <>
      <Navbar user={user} notifications={notifications} />
      <Home user={user} reviewerTeamsAssessments={reviewerTeamsAssessments}/>
    </>
  );
}