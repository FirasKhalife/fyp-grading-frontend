import IReviewer from "../interface/IReviewer.view";

export default class ReviewerUtils {

  static getReviewerFullName = (reviewer: IReviewer) : string => {
    return reviewer.firstName + ' ' + reviewer.lastName;
  } 

}