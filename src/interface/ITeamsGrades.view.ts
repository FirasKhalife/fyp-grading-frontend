import IAssessmentGrade from "./IAssessmentGrade.view";
import ITeam from "./ITeam.view";

interface ITeamGrades {
  team: ITeam;
  assessmentGradeList: IAssessmentGrade[];
}
export default ITeamGrades;