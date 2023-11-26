import AssessmentEnum from "../enums/AssessmentEnum";

interface IReceivedNotification {
  id: number;
  teamId: number;
  assessment: AssessmentEnum;
  gradeFinalizedAt: string;
  isRead: boolean;
}
export default IReceivedNotification;