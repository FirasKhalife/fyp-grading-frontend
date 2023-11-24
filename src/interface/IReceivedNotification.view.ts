
interface IReceivedNotification {
  id: number;
  teamId: number;
  assessment: string;
  gradeFinalizedAt: string;
  isRead: boolean;
}
export default IReceivedNotification;