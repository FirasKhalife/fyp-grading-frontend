import { List, ListItem, ListItemText, Divider } from "@mui/material";
import ITeamGrades from "../interface/ITeamsGrades.view";
import StringUtils from "../utils/StringUtils";
import { Link } from "react-router-dom";
import React from "react";

export default function TeamsGrades(
  { teamsGrades } : { teamsGrades: ITeamGrades[] }
) {

  return (
    <>
      <List sx={{ width: '100%', maxWidth: 360 }}>
        {teamsGrades.map(item => (
          <React.Fragment key={item.team.id}>
            <ListItem alignItems="flex-start">
              <ListItemText
                primary={`Team ${item.team.id}`}
                secondary={
                  <>
                    <List>
                      {item.assessmentGradeList.map(assessmentGrade => (
                        <ListItem
                          key={assessmentGrade.assessment.id}
                          sx={{
                            padding: 0
                          }}
                        >
                          <ListItemText
                            primary={
                              <Link 
                                to={`/teams/${item.team.id}/${assessmentGrade.assessment.name.toLowerCase()}`}
                                state={{previous: '/teams'}}
                              >
                                {`${StringUtils.snakeToTitle(assessmentGrade.assessment.name)} (${assessmentGrade.assessment.weight}%): \
                                  ${assessmentGrade.grade ? assessmentGrade.grade + '/100' : '-'}`}
                              </Link>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                    <br/>
                    <p>
                      {`Final Grade: ${item.team.finalGrade ? item.team.finalGrade + '/100' : '-'}`}
                    </p>
                  </>
                }
              />
            </ListItem>
            <Divider variant="inset" component="li" />
          </React.Fragment>
        ))}
      </List>
    </>
  )
}