// Generated from the fyp-grading-rubric-service seed SQL (criteria, weights, and the proposal,
// progress and advisor level descriptions) and PRODUCT-BRIEF.md Appendix A (final report and
// final presentation level descriptions). The seed's weights win over the design's placeholders.
import type { AssessmentKey } from '@/domain/types'

export interface SeedCriterion {
  name: string
  weight: number
  /** Level descriptions for levels 1, 2, 3, 4. Level 0 always reads "Not addressed." */
  d: [string, string, string, string]
}

export const SEED_RUBRICS: Record<AssessmentKey, SeedCriterion[]> = {
  PROPOSAL_PRESENTATION: [
    {
      name: "Project objectives/Expected outcomes",
      weight: 10,
      d: [
        "Students did not present the objectives of the project and did not identify any outcome.",
        "Students presented some of the objectives of the project or identified marginal outcomes.",
        "Students presented the main objectives of the project and identified the main outcomes.",
        "Students presented all the objectives of the project and set out all the outcomes with justification.",
      ],
    },
    {
      name: "Cite recent developments pertaining to an engineering field",
      weight: 20,
      d: [
        "Students did not cite any recent developments.",
        "Students cited recent developments irrelevant to the project topic.",
        "Students cited recent developments pertaining to an engineering field related to the project topic.",
        "Students cited recent developments pertaining to an engineering field and analysed the relation with the project topic.",
      ],
    },
    {
      name: "Develop functional requirements by analyzing desired needs",
      weight: 20,
      d: [
        "Students did not develop any functional requirements.",
        "Students developped an incomplete set of functional requirements of the project.",
        "Students developped functional requirements of the project.",
        "Students developped functional requirements of the project and analysed their dependencies and organized them by priority.",
      ],
    },
    {
      name: "Develop technical and non-technical constraints",
      weight: 10,
      d: [
        "Students did not develop any constraints.",
        "Students developed incomplete non-technical and technical constraints of the project",
        "Students developed non-technical and measurable technical constraints of the project",
        "Students developed non-technical and measurable technical constraints of the project and related them to functional requirements.",
      ],
    },
    {
      name: "Solution specifications",
      weight: 15,
      d: [
        "Students did not provide solution specification for the project.",
        "Students provided incomplete solution specification for the project.",
        "Students provided solution specification for the project.",
        "Students provided detailed solution specification for the project supported by models and representation (flowcharts, diagrams, etc.).",
      ],
    },
    {
      name: "Future work plan",
      weight: 10,
      d: [
        "Students did not provide a plan for their future work.",
        "Students provided an incomplete work plan (in terms of time, resources, risk management) for their future work.",
        "Students provided a detailed plan for their future work covering time and resources.",
        "Students presented a detailed plan for their future work, covering time and resources (software/hardware, etc.) supported by risk management.",
      ],
    },
    {
      name: "Oral expression",
      weight: 10,
      d: [
        "Students made use of irrelevant semantics and incoherent speech.",
        "Students made use of relevant semantics.",
        "Students made use of relevant semantics supported by a coherent speech.",
        "Students made use of relevant semantics supported by a coherent speech and apporpriate body language.",
      ],
    },
    {
      name: "Slides quality",
      weight: 5,
      d: [
        "Slides followed unstructured outline and had an improper layout (density, numbering, header/footer, etc.).",
        "Slides followed an unstructured outline, or had an improper layout (density, numbering, header/footer, etc.).",
        "Slides followed a structured outline with a proper layout (density, numbering, header/footer, etc.).",
        "Slides followed a structured outline with a proper layout (density, numbering, header/footer, etc.), pertinent verbal transitions and an adpated design.",
      ],
    },
  ],
  PROGRESS_REPORT: [
    {
      name: "Meeting management",
      weight: 20,
      d: [
        "No regular meetings. Missing minutes of meeting.",
        "No regular meetings. Inappropriate minutes of meeting (template is not respected, minimum effort is done to cover meetings topics and guidelines and to submit minutes regularly).",
        "Regular meetings (minimum two per month). Minutes of meetings are regularly submitted, template is respected, and all relevant information is covered.",
        "Self-initiated regular meetings (minimum two per month). Minutes of meetings are regularly submitted, template is respected, and all relevant information is covered.",
      ],
    },
    {
      name: "Proposal report",
      weight: 20,
      d: [
        "Missing or inappropriate proposal report. It does not respect template, and is not submitted on time.",
        "Report respects template and deadline, but minimal effort is done to cover important items.",
        "Report respects template and deadline. All items are covered.",
        "Report respects template and deadline. All items are covered with a high level of relevant details.",
      ],
    },
    {
      name: "Progress report",
      weight: 20,
      d: [
        "Missing or inappropriate progress report. It does not respect template, and is not submitted on time.",
        "Report respects template and deadline, but minimal effort is done to cover important items.",
        "Report respects template and deadline. All items are covered.",
        "Report respects template and deadline. All items are covered with a high level of relevant details.",
      ],
    },
    {
      name: "Proposed solution and implementation progress",
      weight: 20,
      d: [
        "No solution was proposed.",
        "Students proposed a suitable solution incorporating appropriate engineering standards but did not provide any implementation.",
        "Students proposed a suitable solution incorporating appropriate engineering standards and provided an implementation respecting the solution specification.",
        "Students proposed a suitable solution incorporating appropriate engineering standards and provided an implementation respecting the solution specification and validated by tests.",
      ],
    },
    {
      name: "Motivation/initiative/creativity",
      weight: 20,
      d: [
        "Students were passive with no motivation. They did not take any initiative in their work.",
        "Students showed little/unstable motivation. Little initiative has been taken.",
        "Students showed motivation for their project. They were able to take initiatives to make their work advance.",
        "Students were motivated during the project. They took initiative, made their own decisions, and came up with new and creative ideas, propositions, and solutions.",
      ],
    },
  ],
  ADVISOR_ASSESSMENT: [
    {
      name: "Acquire and apply new knowledge as needed, using appropriate learning strategies (7.1)",
      weight: 20,
      d: [
        "Students did not acquire new knowledge.",
        "Students acquired new knowledge but were not able to apply it.",
        "Students acquired and applied relevant new knowledge with guidance.",
        "Students acquired and applied relevant new knowledge autonomously using appropriate learning strategies",
      ],
    },
    {
      name: "Function effectively on a team whose members together provide leadership, create a collaborative and inclusive environment, establish goals, plan tasks, and meet objectives (5.1)",
      weight: 20,
      d: [
        "Students did not establish goals, plan tasks, and meet objectives.",
        "Students collaborated with team members of different backgrounds, in order to establish goals, plan tasks, but did not meet objectives.",
        "Students collaborated with team members of different backgrounds, in order to establish goals, plan tasks, and meet objectives.",
        "Students collaborated with team members of different backgrounds, in order to establish goals, plan tasks, and meet objectives by using collaborative tools.",
      ],
    },
    {
      name: "Skills for engineering practice",
      weight: 20,
      d: [
        "Students showed no skills necessary for engineering practice (such as programming, drawing and manipulating equipment).",
        "Students showed limited skills necessary for engineering practice (such as programming, drawing and manipulating equipment).",
        "Students showed skills necessary for engineering practice of the project (such as programming, drawing and manipulating equipment).",
        "Students showed advanced skills necessary for engineering practice (such as programming, drawing and manipulating equipment).",
      ],
    },
    {
      name: "Objectives/Achievement",
      weight: 20,
      d: [
        "Students failed to attain the main objectives.",
        "Students did not attain all expected objectives.",
        "Students attained the expected objectives.",
        "Students were able to attain the expected objectives and tackled additional ones.",
      ],
    },
    {
      name: "Motivation/initiative/creativity/Meeting management",
      weight: 20,
      d: [
        "Students were passive with no motivation. They did not take any initiative in their work. They had No regular meetings. Missing minutes of meeting.",
        "Students showed little/unstable motivation. Little initiative has been taken. They had No regular meetings. Inappropriate minutes of meeting (template is not respected, minimum effort is done to cover meetings topics and guidelines and to submit minutes regularly).",
        "Students showed motivation for their project. They were able to take initiatives to make their work advance. They had Regular meetings (minimum two per month). Minutes of meetings are regularly submitted, template is respected, and all relevant information is covered.",
        "Students were motivated during the project. They took initiative, made their own decisions, and came up with new and creative ideas, propositions, and solutions. They had Self-initiated regular meetings (minimum two per month). Minutes of meetings are regularly submitted, template is respected, and all relevant information is covered.",
      ],
    },
  ],
  FINAL_REPORT: [
    {
      name: "Project objectives/Outcomes",
      weight: 10,
      d: [
        "Objectives and outcomes are barely stated or unclear.",
        "Objectives are stated vaguely, or several outcomes are missing.",
        "The main objectives and outcomes are stated clearly, with partial justification.",
        "All objectives are stated clearly and measurably, and each outcome is justified and traced to the results achieved.",
      ],
    },
    {
      name: "Background research/Related works",
      weight: 10,
      d: [
        "Little or no background research is presented.",
        "Few works are cited, or they are described without relating them to the project.",
        "Relevant works are described and related to the project, with limited comparison.",
        "Recent, relevant works are critically compared, and the gap the project fills is clearly identified.",
      ],
    },
    {
      name: "Develop functional requirements by analyzing desired needs (2.1)",
      weight: 10,
      d: [
        "Requirements are missing or listed without analysis.",
        "Requirements are incomplete or not clearly linked to needs.",
        "The main functional requirements are identified and mostly testable.",
        "Functional requirements are complete, testable and clearly derived from an analysis of user needs.",
      ],
    },
    {
      name: "Develop technical and non-technical constraints (2.2)",
      weight: 10,
      d: [
        "Constraints are barely mentioned.",
        "Only technical constraints, or only a few constraints, are identified.",
        "The main technical and non-technical constraints are identified.",
        "Technical and non-technical constraints (cost, time, ethics, regulations) are fully identified and quantified where possible.",
      ],
    },
    {
      name: "Problem formulation",
      weight: 10,
      d: [
        "The problem is not clearly formulated.",
        "The problem formulation is partial or ambiguous.",
        "The problem is formulated clearly, with minor gaps in scope or success criteria.",
        "The problem is formulated precisely, with scope, assumptions and success criteria.",
      ],
    },
    {
      name: "Incorporate appropriate engineering standards and specifications related to the engineering design (2.3)",
      weight: 10,
      d: [
        "Standards are not considered.",
        "Standards are mentioned but not applied, or are only partly relevant.",
        "Relevant standards are identified and partly applied.",
        "Relevant standards are identified, cited and explicitly applied in the design.",
      ],
    },
    {
      name: "Propose multiple solutions and evaluate them against functional requirements and constraints (2.4)",
      weight: 10,
      d: [
        "A single solution is presented with no alternatives.",
        "Alternatives are mentioned without a structured evaluation.",
        "At least two alternatives are compared against the main requirements.",
        "Several credible alternatives are evaluated systematically (e.g. with a decision matrix) against requirements and constraints.",
      ],
    },
    {
      name: "Implement, test and iteratively improve a solution satisfying the specified functional requirements and constraints, considering risks, and making trade-offs (2.5)",
      weight: 5,
      d: [
        "The implementation is minimal or untested.",
        "The implementation is partial or only lightly tested.",
        "The solution is implemented and tested against most requirements, with some iteration.",
        "The solution is fully implemented, tested against the requirements, and improved over iterations, with risks and trade-offs documented.",
      ],
    },
    {
      name: "Results presentation and analysis",
      weight: 5,
      d: [
        "Results are missing or unclear.",
        "Results are presented with little analysis.",
        "Results are presented clearly with some analysis.",
        "Results are presented clearly with appropriate figures, analysed critically, and compared with the objectives.",
      ],
    },
    {
      name: "Conclusion and perspectives",
      weight: 5,
      d: [
        "The conclusion is missing or unrelated to the work.",
        "The conclusion is generic, with little reflection.",
        "The conclusion summarises the achievements and mentions future work.",
        "The conclusion summarises the achievements against the objectives, discusses limitations, and proposes concrete future work.",
      ],
    },
    {
      name: "Make informed judgments by considering the impact of engineering solutions in global, economic, environmental and societal contexts (4.2)",
      weight: 5,
      d: [
        "Impacts are not considered.",
        "Impacts are mentioned briefly.",
        "Impacts in several contexts are discussed.",
        "Impacts in all four contexts are analysed and influence design decisions.",
      ],
    },
    {
      name: "Demonstrate written communication skills with a range of audience by writing adequate documents using appropriate format and language (3.1)",
      weight: 5,
      d: [
        "The report is hard to follow and the template is not respected.",
        "The structure is inconsistent or there are frequent language errors.",
        "The report is clear and well structured, with minor errors.",
        "The report is well structured, clear and nearly error-free, and follows the required template.",
      ],
    },
    {
      name: "Scientific referencing",
      weight: 5,
      d: [
        "Sources are missing or not cited.",
        "Citations are incomplete or inconsistent.",
        "Sources are cited with minor inconsistencies.",
        "All sources are cited consistently in a standard style, and the references are recent and relevant.",
      ],
    },
  ],
  FINAL_PRESENTATION: [
    {
      name: "Project objectives/Outcomes",
      weight: 10,
      d: [
        "Students did not clearly present the objectives or outcomes.",
        "Students presented the objectives vaguely or omitted some outcomes.",
        "Students presented the main objectives and outcomes achieved.",
        "Students presented all the objectives clearly and showed which outcomes were achieved, with evidence.",
      ],
    },
    {
      name: "Background research/Related works",
      weight: 10,
      d: [
        "Students presented no related work.",
        "Students mentioned related work briefly, without positioning the project.",
        "Students summarised the relevant related work.",
        "Students positioned the project against recent related work and stated what is new.",
      ],
    },
    {
      name: "Develop functional requirements by analyzing desired needs (2.1)",
      weight: 10,
      d: [
        "Students did not present the requirements.",
        "Students listed the requirements without linking them to the needs or results.",
        "Students presented the main requirements and how they were met.",
        "Students explained how the needs led to the requirements and showed that the requirements were met.",
      ],
    },
    {
      name: "Develop technical and non-technical constraints (2.2)",
      weight: 10,
      d: [
        "Students did not present the constraints.",
        "Students mentioned constraints superficially.",
        "Students presented the main constraints.",
        "Students explained the key constraints and how the design respected them.",
      ],
    },
    {
      name: "Propose multiple solutions and evaluate them against functional requirements and constraints (2.4)",
      weight: 10,
      d: [
        "Students presented only one solution.",
        "Students mentioned alternatives without evaluating them.",
        "Students compared the main alternatives briefly.",
        "Students justified the chosen solution through a clear comparison of alternatives.",
      ],
    },
    {
      name: "Implement, test and iteratively improve a solution satisfying the specified functional requirements and constraints, considering risks, and making trade-offs (2.5)",
      weight: 10,
      d: [
        "Students showed no working solution.",
        "Students showed a partial solution or limited testing.",
        "Students demonstrated a working solution and the main tests.",
        "Students demonstrated a working solution (live or recorded), explained the tests and iterations, and discussed the trade-offs.",
      ],
    },
    {
      name: "Results and analysis",
      weight: 10,
      d: [
        "Results were missing or unclear.",
        "Results were shown with little analysis.",
        "Results were shown clearly, with some analysis.",
        "Results were shown clearly, analysed critically, and linked to the objectives.",
      ],
    },
    {
      name: "Conclusion and perspectives",
      weight: 10,
      d: [
        "There was no real conclusion.",
        "The conclusion was generic.",
        "Students concluded with achievements and next steps.",
        "Students concluded with achievements, limitations and concrete next steps.",
      ],
    },
    {
      name: "Demonstrate oral communication skills with a range of audience by using appropriate verbal and non-verbal language, adopting the appropriate formatting and supporting material (3.2)",
      weight: 10,
      d: [
        "The delivery was hard to follow, and questions were not answered.",
        "The delivery was hesitant or over time, or questions were answered partially.",
        "The delivery was clear and mostly on time, and most questions were answered well.",
        "The delivery was confident, clear and well timed, every member contributed, and questions were answered precisely.",
      ],
    },
    {
      name: "Slides quality",
      weight: 10,
      d: [
        "Slides are hard to read or poorly organised.",
        "Slides are text-heavy or inconsistent.",
        "Slides are clear, with minor layout or density issues.",
        "Slides are clear, consistent and visual, with readable figures and minimal text.",
      ],
    },
  ],
}
