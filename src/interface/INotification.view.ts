
interface INotification {
  id: number;
  teamId: number;
  assessment: string;
  gradeFinalizedAt: Date;
  isRead: boolean;
}
export default INotification;