import { Box, Button, Dialog, DialogActions, DialogTitle, Skeleton } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import ITeam from "../interface/ITeam.view";
import { useState, useEffect } from "react";
import { getAssessments } from "../enums/Assessment";
import IReviewer from "../interface/IReviewer.view";
import ReviewerService from "../services/ReviewerService";
import IGrade from "../interface/IGrade.view";

export default function Home(
  {user, isAdmin, teamsPromise} 
  : {user: IReviewer, isAdmin: boolean, teamsPromise: Promise<ITeam[]>}
) {

  const adminLinks = [
    "Reviewers",
    "All Teams",
  ];

  const [teams, setTeams] = useState<ITeam[]>([]);
  const [grades, setGrades] = useState<IGrade[]>([]);
  const [dialog, setDialog] = useState<{status: boolean, teamId: number}>({status: false, teamId: 0});

  const navigate = useNavigate();

  useEffect(() => {
    console.log("teamsPromise", teamsPromise)
    teamsPromise.then(teams => setTeams(teams));
  
  }, [teamsPromise]);

  const fetchGrades = (teamId: number) => {
    ReviewerService.getReviewerTeamGrades(user.id, teamId)
      .then(data => {
        setGrades(data);
        console.log(data)
      });
  }

  const handleOpenDialog = (teamId: number) : void => {
    setDialog({status: true, teamId: teamId});
    fetchGrades(teamId);
  };

  return (
    <>
      {isAdmin && (
        <>
          <Box
            sx={{
              width: '100%',
              margin: '1rem 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'start',
              '& > :not(style)': {m: 1},
            }}>
            {adminLinks.map((link) => (
              <Button
                variant="outlined"
                key={link}
                sx={{
                  mt: 1, mb: 1,
                  width: '10rem',
                  height: '3rem',
                }}
              >
                <Link to={`/${link.toLowerCase()}`}>{link}</Link>
              </Button>
            ))}
          </Box>
        </>
      )}
      <>
        <Dialog
          open={dialog.status}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          onClose={() => setDialog(prev => ({...prev, status: false}))}
          sx={{
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 'fit-content',
              overflow: 'hidden',
            }}>
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
              {getAssessments().filter(a => a != 'ALL').map((assessment) => (
                <Button
                  key={assessment}
                  variant="outlined"
                  onClick={() => navigate(`/evaluations/${dialog.teamId}/${assessment.toLowerCase()}`)}
                  sx={{
                    mt: 1, mb: 1,
                    width: '12rem',
                    height: '4rem',
                    backgroundColor: 'rgba(117,185,231, 0.2)',
                  }}
                  disabled={grades.find(grade => grade.assessment == assessment)?.grade ? true : false}
                >
                  <h4>{assessment.replace('_', ' ')}</h4>
                  <p
                    style={{
                      position:'absolute',
                      top: '50%',
                      fontSize: 13,
                      color: 'palevioletred',
                      textTransform: 'none',
                    }}
                  >{grades.find(grade => grade.assessment == assessment)?.grade 
                    ? 'Submitted' : ''}</p>
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
          {teams.length === 0 ? (
            <Skeleton 
              variant="rectangular" 
              width={'100%'} height={'9rem'}
              sx={{ bgcolor: 'white' }}
              />
          ) : (
            <>
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
                {teams.map((team) => (
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
            </>
          )}
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
            {getAssessments().filter(a => a != 'ALL').map((assessment) => (
              <Button
                key={assessment}
                variant="outlined"
                onClick={() => navigate(`/rubrics/${assessment.toLowerCase()}`)}
                sx={{
                  mt: 1, mb: 1,
                  width: '12rem',
                  height: '4rem',
                  margin: '0 1rem',
                  backgroundColor: 'rgba(117,185,231, 0.2)',
                }}
              >
                <h4>{assessment.replace('_', ' ')}</h4>
              </Button>
            ))}
          </Box>
        </div>
      </>
    </>
  );
}