import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import IGradedEvaluation from "../interface/IGradedEvaluation.view";
import ReviewerUtils from "../utils/ReviewerUtils";
import Evaluation from "./Evaluation";

export default function TeamEvaluations(
  { evaluations }: { evaluations: IGradedEvaluation[] }
) {

  return (
    <>
      {evaluations.map(evaluation => (
        <Accordion
          key={evaluation.reviewer.id}
          disabled={!evaluation.grade}  
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography>
              {`${ReviewerUtils.getReviewerFullName(evaluation.reviewer)}: \
                ${evaluation.grade ? evaluation.grade + '/100' : 'No submission yet'}`}
            </Typography>
          </AccordionSummary>
          
          {evaluation.grade && (
            <AccordionDetails
              sx={{
                padding: 0
              }}
            >
              <Evaluation 
                evaluation={
                  {
                    id: null,
                    reviewerId: evaluation.reviewer.id,
                    teamId: evaluation.team.id,
                    assessment: evaluation.assessment.name,
                    gradedRubrics: evaluation.gradedRubrics
                  }
                }
                readOnly={true}
              />
            </AccordionDetails>
          )}
        </Accordion>
      ))}
    </>
  );
}