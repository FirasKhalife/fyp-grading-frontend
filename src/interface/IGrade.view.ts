import IAssessment from "./IAssessment.view";
import IReviewer from "./IReviewer.view";
import ITeam from "./ITeam.view";

interface IGrade {
  team: ITeam;
  reviewer: IReviewer;
  assessment: IAssessment;
  grade: number;
}
export default IGrade;