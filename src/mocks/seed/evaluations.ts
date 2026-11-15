import type { AssessmentKey, Level } from '@/domain/types'

/**
 * Who graded what, and with which score. Scores are the reviewer scores from the handoff, adjusted
 * to values the seed's real weights can produce (a rubric of five 20% criteria only moves in steps
 * of 5). The final grades of Alpha (88.0) and Gamma (92.2) and every highlighted demo moment are kept:
 * the Beta proposal spread (21.3), the Delta progress outlier (35.0), Jane's Beta draft (53.8).
 */

export interface EvalSpec {
  reviewer: string
  status: 'SUBMITTED' | 'DRAFT'
  /** Target reviewer score; the solver picks the levels. */
  score?: number
  /** Exact levels (overrides score). null = not scored yet (drafts). */
  levels?: (Level | null)[]
  /** Levels to start the solver from (from the design boards). */
  prefer?: Level[]
  /** [days from today, "hh:mm"] for the submit or last-save time. */
  at: [number, string]
  /** Comments by criterion index (0-based). */
  comments?: Record<number, string>
  overall?: string
  history?: { at: [number, string]; text: string }[]
}

type TeamSpec = Partial<Record<AssessmentKey, EvalSpec[]>>

const sub = (reviewer: string, score: number, at: [number, string], extra: Partial<EvalSpec> = {}): EvalSpec => ({
  reviewer,
  status: 'SUBMITTED',
  score,
  at,
  ...extra,
})

export const EVALUATIONS: Record<string, TeamSpec> = {
  't-alpha': {
    PROPOSAL_PRESENTATION: [
      sub('r-jane', 88.75, [-111, '16:20'], {
        overall: 'Clear objectives and a credible plan. Tighten the constraints section before the progress report.',
        comments: { 3: 'Power and water-cost constraints are named but not quantified yet.' },
      }),
      sub('r-john', 85, [-111, '17:05'], { comments: { 1: 'Good survey of commercial controllers; add one academic reference on soil-moisture forecasting.' } }),
      sub('r-lea', 86.25, [-110, '09:30'], { comments: { 6: 'Confident delivery, and every member spoke.' } }),
    ],
    PROGRESS_REPORT: [
      sub('r-jane', 85, [-76, '11:00']),
      sub('r-john', 85, [-76, '14:40'], {
        overall: 'Meetings are well documented. Implementation is on track, but testing has not started yet.',
        comments: { 3: 'The sensor node works on the bench; plan the field test now.' },
      }),
      sub('r-lea', 80, [-75, '10:10'], { comments: { 2: 'The progress report is clear, but the Gantt chart is out of date.' } }),
    ],
    ADVISOR_ASSESSMENT: [
      sub('r-emily', 90, [-6, '18:00'], {
        overall: 'The team met every week and kept a decision log. The forecasting model was their own initiative.',
        comments: { 1: 'Tasks were shared fairly, and the weekly log shows it.', 4: 'Always prepared for meetings.' },
      }),
    ],
    FINAL_REPORT: [
      sub('r-jane', 87.5, [-3, '17:30'], { comments: { 6: 'The decision matrix for the controller board is convincing.', 12: 'Two web sources have no access date.' } }),
      sub('r-john', 86.25, [-3, '19:10'], { comments: { 8: 'Add the forecast error per week, not only the average.' } }),
      sub('r-lea', 88.75, [-2, '08:45'], {
        overall: 'A well-argued alternatives chapter. Referencing style is inconsistent in chapter 5.',
        comments: { 12: 'Chapter 5 switches between IEEE and APA.' },
      }),
    ],
    FINAL_PRESENTATION: [
      {
        reviewer: 'r-jane',
        status: 'SUBMITTED',
        levels: [4, 3, 4, 3, 3, 4, 4, 3, 4, 3],
        at: [-1, '10:05'],
        comments: { 5: 'The live demo with the soil probe worked first time, and the forecasting fallback was a nice touch.', 8: 'Everyone spoke, and the questions on sensor calibration were answered precisely.' },
      },
      {
        reviewer: 'r-john',
        status: 'SUBMITTED',
        levels: [4, 3, 3, 3, 3, 4, 3, 4, 4, 3],
        at: [-1, '10:20'],
        comments: {
          3: 'The water-cost constraint was clear; the power budget for the field node was not quantified.',
          6: 'Show the forecast error per week, not only the average.',
          9: 'Slide 14 is dense; split the architecture diagram.',
        },
      },
      {
        reviewer: 'r-lea',
        status: 'SUBMITTED',
        levels: [4, 4, 4, 3, 4, 4, 3, 3, 4, 3],
        at: [-1, '10:40'],
        overall: 'A confident defense. The live demo made the results convincing.',
        comments: {
          1: 'Good positioning against commercial controllers; cite the 2024 FAO irrigation study you mentioned.',
          7: 'Next steps are concrete; say which ones you would drop with less time.',
        },
      },
    ],
  },

  't-beta': {
    PROPOSAL_PRESENTATION: [
      sub('r-john', 85, [-111, '15:00'], { prefer: [4, 3, 4, 3, 3, 3, 4, 3], comments: { 2: 'Requirements are specific and testable.' } }),
      sub('r-michael', 63.75, [-110, '18:30'], {
        prefer: [4, 2, 3, 2, 2, 3, 1, 3],
        comments: { 6: 'Hard to hear at the back; slow down and face the jury.' },
        overall: 'The idea is sound, but the delivery lost the room. Rehearse with a timer.',
      }),
      sub('r-jane', 73.75, [-110, '12:15'], {
        prefer: [4, 2, 3, 3, 3, 2, 3, 3],
        comments: { 1: 'Only two related systems; look at open-source queue tools too.' },
      }),
    ],
    PROGRESS_REPORT: [
      sub('r-john', 70, [-76, '09:40']),
      sub('r-michael', 65, [-75, '16:00'], { comments: { 3: 'The SMS gateway is still mocked; test with a real provider soon.' } }),
      sub('r-jane', 75, [-76, '13:20'], { comments: { 0: 'Minutes are kept, but actions have no owners.' } }),
    ],
    ADVISOR_ASSESSMENT: [
      sub('r-emily', 80, [-6, '17:00'], { overall: 'Steady work all year. Ahmad and Yara carried the backend; spread it more next time.' }),
    ],
    FINAL_REPORT: [
      sub('r-john', 77.5, [-2, '18:20'], { comments: { 5: 'GSM standards are listed in an annex but never used.' } }),
      sub('r-michael', 75, [-1, '20:05']),
      {
        reviewer: 'r-jane',
        status: 'DRAFT',
        levels: [3, 3, 4, 2, 3, 2, 3, null, null, null, null, 3, null],
        at: [0, '10:15'],
        comments: {
          2: 'Requirements trace cleanly to the interviews with clinic staff.',
          3: 'Cost and time are covered, but nothing on patient-data privacy, which matters for an SMS system.',
          5: 'GSM and SMS-gateway standards are cited but never shown shaping the design.',
          11: 'Chapter 4 repeats chapter 2; figures lack captions.',
        },
        history: [
          { at: [-2, '16:30'], text: 'Started the draft · 4 of 13 scored' },
          { at: [0, '10:12'], text: 'Set Standards (2.3) to 2 and added a comment' },
          { at: [0, '10:15'], text: 'Changed Problem formulation 2 → 3' },
        ],
      },
    ],
  },

  't-gamma': {
    PROPOSAL_PRESENTATION: [
      sub('r-rania', 92.5, [-111, '10:00']),
      sub('r-karim', 90, [-111, '11:30'], { comments: { 1: 'Strong review of Arabic OCR work since 2020.' } }),
      sub('r-michael', 91.25, [-110, '09:15']),
    ],
    PROGRESS_REPORT: [sub('r-rania', 90, [-76, '10:00']), sub('r-karim', 90, [-76, '12:00']), sub('r-michael', 85, [-75, '15:30'])],
    ADVISOR_ASSESSMENT: [sub('r-lea', 95, [-7, '19:00'], { overall: 'An outstanding team: autonomous, rigorous and generous with their time.' })],
    FINAL_REPORT: [
      sub('r-rania', 92.5, [-3, '11:00']),
      sub('r-karim', 91.25, [-3, '15:45'], { comments: { 8: 'The confusion matrix per character class is excellent.' } }),
      sub('r-michael', 91.25, [-2, '09:00']),
    ],
    FINAL_PRESENTATION: [sub('r-rania', 90, [-1, '12:10']), sub('r-karim', 90, [-1, '12:25']), sub('r-michael', 92.5, [-1, '16:20'])],
  },

  't-delta': {
    PROPOSAL_PRESENTATION: [sub('r-john', 65, [-110, '14:00']), sub('r-emily', 60, [-110, '15:10'])],
    PROGRESS_REPORT: [
      sub('r-john', 35, [-75, '11:00'], {
        comments: { 3: 'Almost nothing is implemented yet, and the plan has not changed since February.', 4: 'Two meetings were missed without notice.' },
        overall: 'Behind schedule. Agree a reduced scope with your advisor this week.',
      }),
      sub('r-emily', 80, [-75, '16:30']),
    ],
    ADVISOR_ASSESSMENT: [
      {
        reviewer: 'r-karim',
        status: 'DRAFT',
        levels: [3, 2, 3, null, null],
        at: [0, '11:02'],
        history: [{ at: [0, '11:02'], text: 'Started the draft · 3 of 5 scored' }],
      },
    ],
  },

  't-epsilon': {
    PROPOSAL_PRESENTATION: [sub('r-jane', 80, [-111, '13:00']), sub('r-lea', 78.75, [-110, '10:30']), sub('r-karim', 80, [-110, '11:45'])],
    PROGRESS_REPORT: [sub('r-jane', 75, [-76, '10:30']), sub('r-lea', 75, [-75, '09:00']), sub('r-karim', 75, [-75, '12:30'])],
    ADVISOR_ASSESSMENT: [sub('r-john', 80, [-6, '12:00'])],
    FINAL_REPORT: [sub('r-jane', 78.75, [-3, '14:10']), sub('r-lea', 77.5, [-2, '17:40']), sub('r-karim', 77.5, [-2, '19:00'])],
    FINAL_PRESENTATION: [sub('r-lea', 82.5, [0, '11:48'])],
  },

  't-zeta': {
    PROPOSAL_PRESENTATION: [sub('r-emily', 82.5, [-111, '09:30']), sub('r-lea', 80, [-110, '11:00']), sub('r-john', 81.25, [-110, '16:00'])],
    PROGRESS_REPORT: [sub('r-emily', 80, [-76, '15:00']), sub('r-lea', 75, [-75, '10:00']), sub('r-john', 75, [-75, '13:00'])],
    FINAL_REPORT: [sub('r-emily', 80, [-3, '10:00']), sub('r-lea', 81.25, [-3, '16:30']), sub('r-john', 80, [-2, '11:15'])],
    FINAL_PRESENTATION: [sub('r-emily', 82.5, [-1, '15:30']), sub('r-lea', 85, [-1, '16:00']), sub('r-john', 82.5, [-1, '17:15'])],
  },
}

/** Released assessments per team: [team, days from today, "hh:mm"]. */
export const RELEASES: Partial<Record<AssessmentKey, [string, number, string][]>> = {
  PROPOSAL_PRESENTATION: ['t-alpha', 't-beta', 't-gamma', 't-delta', 't-epsilon', 't-zeta'].map((t) => [t, -99, '10:00']),
  PROGRESS_REPORT: ['t-alpha', 't-beta', 't-gamma', 't-delta', 't-epsilon', 't-zeta'].map((t) => [t, -63, '10:00']),
  ADVISOR_ASSESSMENT: [
    ['t-alpha', -4, '09:00'],
    ['t-gamma', -4, '09:00'],
  ],
  FINAL_REPORT: [
    ['t-alpha', -2, '09:00'],
    ['t-gamma', -2, '09:00'],
  ],
  FINAL_PRESENTATION: [['t-alpha', -1, '12:05']],
}

/**
 * A few remarks per criterion, reused for reviewers who left no specific comment, so roughly half of
 * all criteria carry feedback written like a real jury's.
 */
export const COMMENT_POOL: Record<AssessmentKey, string[]> = {
  PROPOSAL_PRESENTATION: [
    'Objectives are clear; make the expected outcomes measurable.',
    'Cite at least one peer-reviewed source from the last three years.',
    'Prioritise the requirements: which ones are must-haves for June?',
    'Non-technical constraints (cost, privacy) need more than one line.',
    'The architecture slide is good; add the data flow.',
    'The plan is realistic, but leave a buffer before the defense.',
    'Good pace; keep eye contact with the jury.',
    'Slides are clean. Number them so the jury can refer to them.',
  ],
  PROGRESS_REPORT: [
    'Meeting minutes are kept, with clear actions.',
    'The proposal report was revised as asked.',
    'The progress report reads well; update the timeline.',
    'Implementation is moving; start integration testing now.',
    'Good initiative on the extra feature, but keep the scope in check.',
  ],
  ADVISOR_ASSESSMENT: [
    'Picked up the new framework quickly and documented it for the team.',
    'Work was shared fairly, with a weekly rota.',
    'Code reviews and version control were used well.',
    'Most objectives were met; the stretch goal was dropped sensibly.',
    'Always came to meetings with an agenda.',
  ],
  FINAL_REPORT: [
    'Objectives are traced to results in the conclusion. Good.',
    'Related work is broad; compare it more critically.',
    'Requirements are testable and traced to user needs.',
    'Constraints are quantified where it matters.',
    'The problem statement is precise.',
    'Standards are cited; show where they shaped the design.',
    'The alternatives table is clear.',
    'Testing is described, but iterations are not.',
    'Figures need captions and units.',
    'The conclusion is honest about limitations.',
    'Societal impact gets one paragraph; it deserves a section.',
    'Well written, with few language errors.',
    'References are consistent and recent.',
  ],
  FINAL_PRESENTATION: [
    'Objectives were restated clearly at the start.',
    'Related work was positioned briefly but well.',
    'Requirements were linked to the demo.',
    'Constraints were mentioned; show how the design respected them.',
    'The choice of solution was justified.',
    'The demo worked and the tests were explained.',
    'Results were shown with error bars. Good.',
    'Concrete next steps.',
    'Clear delivery; questions answered well.',
    'Slides were readable and not overloaded.',
  ],
}
