import { Box, Button, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import IReviewer from "../interface/IReviewer.view";
import StringUtils from "../utils/StringUtils";
import IReviewerTeamsAssessments from "../interface/IReviewerTeamsAssessments.view";

interface IDialog {
  status: boolean;
  teamId: number;
  teamIndex: number;
}

const defaultDialog : IDialog = {
  status: false,
  teamId: -1,
  teamIndex: -1,
};

export default function Home(
  {user, reviewerTeamsAssessments : { reviewerAssessments, reviewerTeams }} 
  : {user: IReviewer, reviewerTeamsAssessments : IReviewerTeamsAssessments }
) {

  const [dialog, setDialog] = useState<IDialog>(defaultDialog);

  const navigate = useNavigate();

  function handleOpenDialog(teamId: number) {
    setDialog({
      status: true, 
      teamId: teamId, 
      teamIndex: reviewerTeams.findIndex(revTeam => revTeam.team.id == teamId)
    });
  }

  const handleCloseDialog = () : void => {
    setDialog(prev => ({...prev, status: false}));
    setTimeout(() => {
      setDialog(defaultDialog);
    }, 100);
  };

  return (
    <>
      {user.isAdmin && (
        <>
          <Box
            sx={{
              width: '100%',
              margin: '1rem 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'start',
              '& > :not(style)': {m: 1},
            }}
          >
            <Button
              onClick={() => navigate(`/teams`, {state: {previous: '/'}})}
              variant="outlined"
              sx={{
                mt: 1, mb: 1,
                width: '10rem',
                height: '4rem',
                margin: '0 1rem',
                backgroundColor: 'rgba(117,185,231, 0.2)',
              }}
            >
              <h4>All Teams</h4>
            </Button>
          </Box>
        </>
      )}
      <>
        <Dialog
          open={dialog.status}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          onClose={handleCloseDialog}
          sx={{
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 'fit-content',
              overflow: 'hidden',
            }}
          >
            <DialogTitle id="alert-dialog-title">
              {`Evaluate Team ${dialog.teamId}`}
            </DialogTitle>
            <DialogActions
              sx={{
                width: '100%',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                '& > :not(style)': {m: 1},
              }}
            >
              {reviewerTeams[dialog.teamIndex]?.teamAssessments.map(assessment => (
                <Button
                  key={assessment.id}
                  variant="outlined"
                  onClick={() => 
                    navigate(`/evaluations/${dialog.teamId}/${assessment.name.toLowerCase()}`,
                              {state: {previous: '/'}})
                  }
                  sx={{
                    mt: 1, mb: 1,
                    width: '12rem',
                    height: '4rem',
                    backgroundColor: 'rgba(117,185,231, 0.2)',
                  }}
                  disabled={assessment.grade !== null}
                >
                  <h4>{StringUtils.snakeToTitle(assessment.name)}</h4>
                  <p
                    style={{
                      position:'absolute',
                      top: '50%',
                      fontSize: 13,
                      color: 'palevioletred',
                      textTransform: 'none',
                    }}
                  >
                    {
                      assessment.grade ? 'Submitted' : ''
                    }</p>
                </Button>
              ))}
            </DialogActions>
          </div>
        </Dialog>
        <div
          style={{
            marginTop: '3rem',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f5f5f5',
          }}
        >
          <h2>Evaluate Team</h2>
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexWrap: 'wrap',
              height: '9rem',
              minHeight: 'min-content',
              alignItems: 'center',
              justifyContent: 'center',
              '& > :not(style)': {m: 1},
            }}
          >
            {reviewerTeams.map(({team}) => (
              <Button
                key={team.id}
                variant="outlined"
                sx={{
                  mt: 1, mb: 1,
                  width: '10rem',
                  height: '4rem',
                  margin: '0 1rem',
                  backgroundColor: 'rgba(117,185,231, 0.2)',
                }}
                onClick={() => handleOpenDialog(team.id)}
              >
                <h4>Team {team.id}</h4>
              </Button>
            ))
            }
          </Box>
        </div>

        <div
          style={{
            marginTop: '3rem',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f5f5f5',
          }}
        >
          <h2>Rubrics</h2>
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              '& > :not(style)': {m: 1},
            }}
          >
            {reviewerAssessments.map(assessment => (
              <Button
                key={assessment.id}
                variant="outlined"
                onClick={() => 
                  navigate(`/rubrics/${assessment.name.toLowerCase()}`,
                            {state: {previous: '/'}})
                }
                sx={{
                  mt: 1, mb: 1,
                  width: '12rem',
                  height: '4rem',
                  margin: '0 1rem',
                  backgroundColor: 'rgba(117,185,231, 0.2)',
                }}
              >
                <h4>{assessment.name.replace('_', ' ')}</h4>
              </Button>
            ))}
          </Box>
        </div>
      </>
    </>
  );
}