import { Box, Button, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import ITeam from "../interface/ITeam.view";
import { useState } from "react";
import Assessment, { getReviewerAssessments, getReviewerTeamAssessments } from "../enums/Assessment";
import IReviewer from "../interface/IReviewer.view";
import IGrade from "../interface/IGrade.view";
import AdminService from "../services/AdminService";
import { snakeToTitle } from "../utils/snakeToTitle";

const adminLinks = [
  "Reviewers",
  "All Teams",
];

export default function Home(
  {user, teams} 
  : {user: IReviewer, teams: ITeam[]}
) {

  const [dialog, setDialog] = useState<{status: boolean, teamId: number}>({status: false, teamId: 0});
  const [reviewerTeamAssessments, setReviewerTeamAssessments] = useState<Assessment[]>([]);
  const [grades, setGrades] = useState<IGrade[]>([]);

  const navigate = useNavigate();

  async function handleOpenDialog(teamId: number) {
    getReviewerTeamAssessments(user.id, teamId)
      .then(res => {
        setReviewerTeamAssessments(res)
        AdminService.getReviewerTeamGrades(user.id, teamId)
          .then(res => res.json())
          .then(data => {
            setGrades(data);
            setDialog({status: true, teamId: teamId});
          });
        })
  }

  const handleCloseDialog = () : void => {
    setDialog(prev => ({...prev, status: false}));
    setTimeout(() => {
      setReviewerTeamAssessments([]);
      setGrades([]);
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
          onClose={handleCloseDialog}
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
              {reviewerTeamAssessments.map((assessment) => (
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
                  <h4>{snakeToTitle(assessment)}</h4>
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
            {getReviewerAssessments().map((assessment) => (
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