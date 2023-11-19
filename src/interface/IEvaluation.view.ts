import IGradedRubric from "./IGradedRubric.view";

interface IEvaluation {
  id: string|null;
  reviewerId: number;
  teamId: number;
  assessment: string;
  gradedRubrics: IGradedRubric[];
}
export default IEvaluation;