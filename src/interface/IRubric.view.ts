import Assessment from "../enums/Assessment";

interface IRubric {
  id: number;
  name: string;
  percentage: number;
  assessment: Assessment;
}
export default IRubric;