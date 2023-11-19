import ITeam from "../../interface/ITeam.view";
import AuthService from "../../services/AuthService";
import ReviewerService from "../../services/ReviewerService";

export default function homeLoader() {
  
  const user = AuthService.getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const teamsPromise: Promise<ITeam[]> = ReviewerService.getReviewerTeams(user.id);

  return {user: user, teamsPromise: teamsPromise};
}