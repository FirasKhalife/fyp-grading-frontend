import IRubric from "../../interface/IRubric.view";
import AuthService from "../../services/AuthService";
import ReviewerService from "../../services/ReviewerService";
import Assessment from "../../enums/Assessment";

function allRubricsLoader() {
  
  const user = AuthService.getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const rubricsPromise : Promise<IRubric[]> = ReviewerService.getAllRubrics();

  console.log('in allRubricsLoader:' + rubricsPromise);

  return {user: user, rubricsPromise: rubricsPromise, assessment: Assessment.ALL};
}

function assessmentRubricsLoader(assessment: string) {
  
  const user = AuthService.getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const rubricsPromise : Promise<IRubric[]> = ReviewerService.getAssessmentRubrics(assessment);

  console.log('in assessmentRubricsLoader:' + rubricsPromise);

  return {user: user, rubricsPromise: rubricsPromise, assessment: assessment};
}

export { allRubricsLoader, assessmentRubricsLoader };