import IAssessment from "./IAssessment.view";

interface IAssessmentGrade {
  teamId: number;
  assessment: IAssessment;
  grade: number;
}
export default IAssessmentGrade;