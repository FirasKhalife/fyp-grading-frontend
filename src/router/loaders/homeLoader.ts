import IHome from "../../interface/IHome.view";
import IReviewer from "../../interface/IReviewer.view";
import AdminService from "../../services/AdminService";
import AuthUtils from "../../utils/AuthUtils";

export default async function homeLoader() {
  
  const user: IReviewer = AuthUtils.checkAndGetCurrentUser();

  const homeResponse : Response = await AdminService.getReviewerHomeData(user.id);
  const {reviewerTeamsAssessments, notifications} : IHome = await homeResponse.json();
  
  localStorage.setItem("notifications", JSON.stringify(notifications));

  return {user: user, reviewerTeamsAssessments: reviewerTeamsAssessments, notifications: notifications};
}