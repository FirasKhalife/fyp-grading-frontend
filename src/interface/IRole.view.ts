import RoleEnum from "../enums/RoleEnum";
import IAssessment from "./IAssessment.view";

interface IRole {
  id: number;
  name: RoleEnum;
  assessments: IAssessment[];
}
export default IRole;