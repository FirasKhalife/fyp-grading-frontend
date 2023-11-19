import INotification from "../../interface/INotification.view";
import ITeam from "../../interface/ITeam.view";
import AdminService from "../../services/AdminService";
import AuthService from "../../services/AuthService";
import ReviewerService from "../../services/ReviewerService";
import isAdmin from "../../utils/auth/isAdmin";

export default async function homeLoader() {
  
  const user = AuthService.getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const teamsResponse : Response = await ReviewerService.getReviewerTeams(user.id);
  const teams : ITeam[] = await teamsResponse.json();

  const notificationPromise : Response = 
        isAdmin(user) ? await AdminService.getNotifications() : new Response("[]");
  const notifications : INotification[] = await notificationPromise.json();

  return {user: user, teams: teams, notifications: notifications};
}