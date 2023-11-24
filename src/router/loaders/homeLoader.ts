import INotification from "../../interface/INotification.view";
import IReceivedNotification from "../../interface/IReceivedNotification.view";
import ITeam from "../../interface/ITeam.view";
import AdminService from "../../services/AdminService";
import AuthService from "../../services/AuthService";
import NotificationService from "../../services/NotificationService";
import stringToDate from "../../utils/stringToDate";

export default async function homeLoader() {
  
  const user = AuthService.getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const teamsResponse : Response = await AdminService.getReviewerTeams(user.id);
  const teams : ITeam[] = await teamsResponse.json();

  const notificationPromise : Response = 
        user.isAdmin ? await NotificationService.getNotifications() : new Response("[]");

  const receivedNotifications : IReceivedNotification[] = await notificationPromise.json();

  const notifications : INotification[] = receivedNotifications.map((notif) => (
      {...notif, gradeFinalizedAt: stringToDate(notif.gradeFinalizedAt)}
  ));
  
  localStorage.setItem("notifications", JSON.stringify(notifications));

  console.log("HomeLoader: ", user, teams, notifications);

  return {user: user, teams: teams, notifications: notifications};
}