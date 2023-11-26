import IAssessment from "./IAssessment.view";
import IGradedRubric from "./IGradedRubric.view";
import IReviewer from "./IReviewer.view";
import ITeam from "./ITeam.view";

interface IGradedEvaluation {
  reviewer: IReviewer;
  team: ITeam;
  assessment: IAssessment;
  gradedRubrics: IGradedRubric[];
  grade: number;
}
export default IGradedEvaluation;