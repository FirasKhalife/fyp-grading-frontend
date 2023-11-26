import AssessmentEnum from "../enums/AssessmentEnum";

interface INotification {
  id: number;
  teamId: number;
  assessment: AssessmentEnum;
  gradeFinalizedAt: Date;
  isRead: boolean;
}
export default INotification;