import { useState } from "react";
import { useNavigate } from "react-router-dom";
import IEvaluation from "../interface/IEvaluation.view";
import IGradedRubric from "../interface/IGradedRubric.view";
import { Select, MenuItem, Button, List, ListItem, ListItemText, SelectChangeEvent, FormGroup, Box, Skeleton, Alert } from "@mui/material";
import ReviewerService from "../services/ReviewerService";
import grades from "../utils/constants/grades";
import CloseIcon from '@mui/icons-material/Close';

export default function Evaluation(
  {evaluation: initialEval, teamId, assessment } 
  : {evaluation: IEvaluation, teamId: number, assessment: string}
) {

  const [evaluation, setEvaluation] = useState<IEvaluation>(initialEval);
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  const navigate = useNavigate();

  const handleChangeGrade = (event: SelectChangeEvent, rubric : IGradedRubric) => {
    const newGradedRubric : IGradedRubric =
      {
        name: rubric.name,
        percentage: rubric.percentage,
        grade: Number(event.target.value),
      };
    
    setEvaluation((prevEval) => (
      {
        ...prevEval,
        gradedRubrics: 
          prevEval.gradedRubrics.map((rubric) => (
            rubric.name === newGradedRubric.name ? newGradedRubric : rubric
          )
        )
      }
    ));
  };

  const handleDraft = () => {
    ReviewerService.draftEvaluation(evaluation)
      .then(res => res.json())
      .then((response: IEvaluation) => {
          setIsAlertOpen(true);
          setEvaluation(response)
      });
  }

  const handleSubmit = () => {

    if (evaluation.gradedRubrics.some((rubric) => rubric.grade === 0)) {
      alert("Please grade all rubrics");
      return;
    }

    ReviewerService.submitEvaluation(evaluation)
      .then(res => res.json())
      .then(() => { navigate(`/`) });
  }

  return (
    <>
      {isAlertOpen &&
        <Alert 
          severity="success"
          sx={{
            position: "fixed",
            top: 0, left: 0, right: 0,
            height: 'min-content',
            padding: '0 8px',
            borderBottom: '1px solid #4caf50',
          }}
        >
          Evaluation drafted!
        
          <CloseIcon 
            sx={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
            }}
            onClick={() => setIsAlertOpen(false)} />
        </Alert>
      }
      <h2>{`Grading ${assessment} for Team ${teamId}`} </h2>
        <FormGroup>
          <List
            dense
            sx={{ 
              width: 500,
              bgcolor: 'background.paper' 
            }}
          >
            {evaluation.reviewerId === 0 ? (

              [...Array(10)].map(() =>(
                <Skeleton animation="wave" />
              ))

            ) : (

              evaluation.gradedRubrics.length === 0 ? (
                <h3>Oh Uh, no rubrics yet!</h3>

              ) : (

              evaluation.gradedRubrics.map((rubric: IGradedRubric) => (
              <ListItem 
                key={rubric.name}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <ListItemText 
                  primary={rubric.name} 
                  secondary={`${rubric.percentage}%`} 
                />
                <Select 
                  sx={{marginLeft: '16px'}}
                  labelId="demo-simple-select-filled-label"
                  id="demo-simple-select-filled"
                  value={evaluation.gradedRubrics.find((r) => r.name === rubric.name)?.grade || 0}
                  onChange={(event) => handleChangeGrade(event as SelectChangeEvent, rubric)}
                >
                  <MenuItem value={0}>
                    <em>None</em>
                  </MenuItem>
                  {grades.map((grade) => (
                    <MenuItem value={grade.value}>{grade.title}</MenuItem>
                  ))}
                </Select>
              </ListItem>
            ))
            
            )
          )}
          </List>
          {evaluation.reviewerId != 0 && evaluation.gradedRubrics.length > 0 &&
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                width: 500,
                bgcolor: 'background.paper' 
              }}
            >
              <Button sx={{width: 100, margin: '0 8px'}} variant="outlined" onClick={handleDraft}>Draft</Button>
              <Button sx={{width: 100, margin: '0 8px'}} variant="contained" onClick={handleSubmit}>Submit</Button>
            </Box>}
        </FormGroup>
    </>
  );
}