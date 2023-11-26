import INotification from "./INotification.view";
import IReviewerTeamsAssessments from "./IReviewerTeamsAssessments.view";

interface IHome {
  reviewerTeamsAssessments: IReviewerTeamsAssessments;
  notifications: INotification[];
}
export default IHome;