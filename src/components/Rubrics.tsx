import { useEffect, useState } from "react";
import IRubric from "../interface/IRubric.view";
import EditIcon from '@mui/icons-material/Edit';
import Dialog from '@mui/material/Dialog';
import ListItemText from '@mui/material/ListItemText';
import ListItem from '@mui/material/ListItem';
import List from '@mui/material/List';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { AppBar, Button, DialogActions, DialogContent, DialogContentText, DialogTitle, TextareaAutosize } from "@mui/material";
import RubricService from "../services/RubricService";
import IReviewer from "../interface/IReviewer.view";
import StringUtils from "../utils/StringUtils";
import AssessmentEnum from "../enums/AssessmentEnum";

export default function Rubrics(
  { user, rubrics: initialRubrics, assessment } 
  : { user: IReviewer, rubrics: IRubric[], assessment: AssessmentEnum }
) {
  const [rubrics, setRubrics] = useState<IRubric[]>(initialRubrics);
  const [rubricsText, setRubricsText] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [validationDialog, setValidationDialog] 
                      = useState<{status: boolean, message: string}>({status: false, message: ''});

  useEffect(() => {
    setRubricsText(displayRubrics(rubrics));
  
  }, [rubrics]);

  const displayRubrics = (rubrics: IRubric[]) => (
    "[\n" +
    rubrics.map(rubric => (
      ` {\n  "name": "${rubric.name}",\n  "percentage": ${rubric.percentage}\n }`
    )).join(',\n')
    + "\n]"
  );

  const handleCloseValidationDialog = (choice: string) => {
    setValidationDialog({...validationDialog, status: false});
    if (choice === 'NO')
        return;
    
    if (validationDialog.message === 'Discard changes?') {
      setIsEditing(false);
      setRubricsText(displayRubrics(rubrics));
      return;
    }

    if (validationDialog.message === 'Save changes?')
      handleUpdateRubrics();
  }

  const handleOpenValidationDialog = (message: string) => {
    setValidationDialog({status: true, message: message});
  }

  const handleOpenTextDialog = () => {
    setIsEditing(true);
  };

  const handleCloseTextDialog = (message: string) => {
    handleOpenValidationDialog(message);
  };

  const handleUpdateRubrics = () => {
    let newRubrics : IRubric[] = [];
    try {
        newRubrics = JSON.parse(rubricsText) as IRubric[];
    } catch (e) {
      setValidationDialog({status: false, message: ''});
      alert('JSON could not be parsed!');
      return;
    }

    newRubrics.forEach(rubric => rubric.assessment = assessment);
    if (newRubrics.reduce((acc, rubric) => acc + rubric.percentage, 0) !== 100) {
      setValidationDialog({status: false, message: ''});
      alert('Percentages does not add up to 100!');
      return;
    }
    
    RubricService.updateRubrics(assessment, newRubrics)
      .then(res => res.json())
      .then((savedRubrics: IRubric[]) => {
        setIsEditing(false);
        setRubrics(savedRubrics);
      });
  }

  return (
    <>
      <div
        style={{
          marginTop: '3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'start',
          position: 'relative',
        }}
      >
        <h2 style={{margin:0}}>Rubrics: {StringUtils.snakeToTitle(assessment.toUpperCase())}</h2>
        {user.isAdmin &&
          <EditIcon 
            sx={{
              marginLeft: '8px',
              cursor: 'pointer'
            }}
            onClick={handleOpenTextDialog}
          />
        }
      </div>
      <List
        dense
        sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}
      >
        {rubrics.length === 0 ? (
          <h3>Oh Uh, no rubrics yet!</h3>
        ) : (
          rubrics.map((rubric: IRubric) => (
            <ListItem key={rubric.id}>
              <ListItemText primary={rubric.name} secondary={`${rubric.percentage}%`} />
            </ListItem>
          ))
        )}
        
        <Dialog
          fullScreen
          open={isEditing}
        >
          <AppBar sx={{ position: 'relative' }}>
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => handleCloseTextDialog('Discard changes?')}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
              <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                Edit Rubrics
              </Typography>
              <Button autoFocus color="inherit" onClick={() => handleCloseTextDialog('Save changes?')}>
                Save
              </Button>
            </Toolbar>
          </AppBar>
          <TextareaAutosize
            id="outlined-textarea"
            aria-label="maximum height"
            name="rubrics-textarea"
            onChange={(e) => setRubricsText(e.target.value)}
            value={rubricsText}
          />
        </Dialog>

        <Dialog
          open={validationDialog.status}
          onClose={() => setValidationDialog(prev => ({...prev, status: false}))}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            {}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              {validationDialog.message}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => handleCloseValidationDialog('NO')}>No</Button>
            <Button onClick={() => handleCloseValidationDialog('YES')}>Yes</Button>
          </DialogActions>
        </Dialog>
      </List>
    </>
  );
}