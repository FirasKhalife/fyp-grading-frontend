import AssessmentEnum from "../enums/AssessmentEnum";

interface IRubric {
  id: number;
  name: string;
  percentage: number;
  assessment: AssessmentEnum;
}
export default IRubric;