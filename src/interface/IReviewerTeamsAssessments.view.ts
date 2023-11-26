import IAssessment from "./IAssessment.view";
import IReviewerTeam from "./IReviewerTeam.view";

interface IReviewerTeamsAssessments {
  reviewerAssessments: IAssessment[];
  reviewerTeams: IReviewerTeam[];
}
export default IReviewerTeamsAssessments;