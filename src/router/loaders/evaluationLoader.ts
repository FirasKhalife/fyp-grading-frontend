import IEvaluation from "../../interface/IEvaluation.view";
import AuthService from "../../services/AuthService";
import ReviewerService from "../../services/ReviewerService";

export default function evaluationLoader(teamId: number, assessment: string) {

  const user = AuthService.getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const evaluationPromise : Promise<IEvaluation | null> = 
          ReviewerService.getReviewerTeamEvaluation(assessment, user.id, teamId);

  return {user: user, evaluationPromise: evaluationPromise, teamId: teamId, assessment: assessment};
}