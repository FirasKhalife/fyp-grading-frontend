import AuthService from "../services/AuthService";
import Role from "./Role";

enum Assessment {
  ORAL_PROPOSAL = 'ORAL_PROPOSAL',
  PROGRESS = 'PROGRESS',
  ADVISOR = 'ADVISOR',
  FINAL_REPORT = 'FINAL_REPORT',
  FINAL_PRESENTATION = 'FINAL_PRESENTATION',

  //for front-end purposes
  ALL = 'ALL',
}

const getAssessments = () => {
  const role: Role = AuthService.getCurrentUser()!.role;
  
  switch (role) {
    case Role.ADMIN:
      return [Assessment.ORAL_PROPOSAL, Assessment.PROGRESS, Assessment.ADVISOR, 
              Assessment.FINAL_REPORT, Assessment.FINAL_PRESENTATION];
    case Role.JURY_MEMBER:
      return [Assessment.ORAL_PROPOSAL, Assessment.PROGRESS, Assessment.FINAL_REPORT, 
              Assessment.FINAL_PRESENTATION];
    case Role.ADVISOR:
        return [Assessment.ADVISOR];
  }
}

export default Assessment; 
export {getAssessments};