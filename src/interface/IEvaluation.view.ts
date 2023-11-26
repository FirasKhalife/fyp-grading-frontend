import AssessmentEnum from "../enums/AssessmentEnum";
import IGradedRubric from "./IGradedRubric.view";

interface IEvaluation {
  id: string|null;
  reviewerId: number;
  teamId: number;
  assessment: AssessmentEnum;
  gradedRubrics: IGradedRubric[];
}
export default IEvaluation;