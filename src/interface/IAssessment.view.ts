import AssessmentEnum from "../enums/AssessmentEnum";
import RoleEnum from "../enums/RoleEnum";

interface IAssessment {
  id: number;
  name: AssessmentEnum;
  weight: number;
  role: RoleEnum[];
}
export default IAssessment;