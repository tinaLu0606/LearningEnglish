# Grading an essay from Claude Code

Use when in-app grading wasn't available ("grade my latest essay").

1. List `submissions`; pick the newest with `status` "submitted" (or the one the learner names).
2. Grade it as a senior IELTS examiner using the public band descriptors, exactly like the in-app prompt in `app/js/ai.js` (`grade`):
   TR (Task Achievement for Task 1 / Task Response for Task 2), CC, LR, GRA in half bands; overall = mean rounded IELTS-style; under-length penalty below 150/250 words; 2–3 sentence comment per criterion; 3–6 `fixes` with exact quotes; one `nextStep`. Plain English with Chinese glosses for technical terms.
3. `update` the submission (pin `if_version`) with `status: "graded"`, `feedback: {overall, criteria:{TR,CC,LR,GRA:{band,comment}}, summary, strengths[], fixes[{quote,better,why}], nextStep, model: "Claude Code"}`, `gradedAt`.
4. Tell the learner the overall band and the single most important fix.
