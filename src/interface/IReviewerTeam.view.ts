import ITeam from "./ITeam.view";
import ITeamReviewerAssessment from "./ITeamReviewerAssessment.view";

interface IReviewerTeam {
  team: ITeam;
  teamAssessments: ITeamReviewerAssessment[];
}
export default IReviewerTeam;